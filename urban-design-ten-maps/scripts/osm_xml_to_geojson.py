#!/usr/bin/env python3
"""Convert OSM XML extracts to projected GeoJSON base layers.

Requires shapely and pyproj. This is a cartographic starting dataset,
not a completeness or topology guarantee.
"""
from __future__ import annotations
import argparse
import json
import xml.etree.ElementTree as ET
from pathlib import Path
from pyproj import Transformer
from shapely.geometry import LineString, Point, Polygon, mapping
from shapely.ops import polygonize, unary_union


def tag_dict(element):
    return {t.attrib["k"]: t.attrib["v"] for t in element.findall("tag")}


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("inputs", nargs="+", type=Path, help="OSM XML files")
    parser.add_argument("--epsg", type=int, required=True, help="Target metric EPSG")
    parser.add_argument("--output", type=Path, required=True)
    return parser.parse_args()


def main():
    args = parse_args()
    transform = Transformer.from_crs(4326, args.epsg, always_xy=True).transform
    nodes, node_elements, ways, relations = {}, {}, {}, {}
    for source in args.inputs:
        for element in ET.parse(source).getroot():
            identity = element.attrib.get("id")
            if element.tag == "node":
                nodes[identity] = transform(float(element.attrib["lon"]), float(element.attrib["lat"]))
                node_elements[identity] = element
            elif element.tag == "way":
                ways[identity] = element
            elif element.tag == "relation":
                relations[identity] = element

    def coords(way):
        return [nodes[n.attrib["ref"]] for n in way.findall("nd") if n.attrib["ref"] in nodes]

    features, relation_member_ways = [], set()

    def emit(layer, osm_type, osm_id, geom, tags):
        if geom is None or geom.is_empty:
            return
        safe_tags = dict(tags)
        if "layer" in safe_tags:
            safe_tags["osm_layer"] = safe_tags.pop("layer")
        properties = {**safe_tags, "layer": layer, "osm_type": osm_type, "osm_id": osm_id}
        features.append({"type": "Feature", "properties": properties, "geometry": mapping(geom)})

    for identity, relation in relations.items():
        tags = tag_dict(relation)
        is_building = "building" in tags
        is_water = tags.get("natural") == "water" or tags.get("waterway") == "riverbank"
        if not (is_building or is_water):
            continue
        outer, inner = [], []
        for member in relation.findall("member"):
            ref = member.attrib.get("ref")
            if member.attrib.get("type") != "way" or ref not in ways:
                continue
            points = coords(ways[ref])
            if len(points) < 2:
                continue
            relation_member_ways.add(ref)
            (inner if member.attrib.get("role") == "inner" else outer).append(LineString(points))
        try:
            geom = unary_union(list(polygonize(unary_union(outer))))
            if inner:
                geom = geom.difference(unary_union(list(polygonize(unary_union(inner)))))
            emit("building" if is_building else "water", "relation", identity, geom, tags)
        except Exception:
            continue

    for identity, way in ways.items():
        tags, points = tag_dict(way), coords(way)
        if len(points) < 2:
            continue
        closed = len(points) >= 4 and points[0] == points[-1]
        if closed and identity not in relation_member_ways and "building" in tags:
            emit("building", "way", identity, Polygon(points).buffer(0), tags)
        if closed and identity not in relation_member_ways and (
            tags.get("natural") == "water" or tags.get("waterway") == "riverbank"
        ):
            emit("water", "way", identity, Polygon(points).buffer(0), tags)
        if "highway" in tags:
            emit("road", "way", identity, LineString(points), tags)
        if "railway" in tags:
            emit("railway", "way", identity, LineString(points), tags)

    useful_point_tags = {"amenity", "shop", "leisure", "tourism", "public_transport", "railway", "highway"}
    for identity, node in node_elements.items():
        tags = tag_dict(node)
        if useful_point_tags.intersection(tags):
            emit("poi", "node", identity, Point(nodes[identity]), tags)

    collection = {
        "type": "FeatureCollection",
        "name": "OSM urban design base layers",
        "crs": {"type": "name", "properties": {"name": f"urn:ogc:def:crs:EPSG::{args.epsg}"}},
        "features": features,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(collection, ensure_ascii=False), encoding="utf-8")
    counts = {}
    for feature in features:
        layer = feature["properties"]["layer"]
        counts[layer] = counts.get(layer, 0) + 1
    print(json.dumps({"output": str(args.output), "counts": counts}, ensure_ascii=False))


if __name__ == "__main__":
    main()

