# 城市分析一表十图 · Codex Skill

公开网页与 Skill 源文件。网页见 index.html，可用 GitHub Pages 发布。

## 安装 Skill
将仓库中的 urban-design-ten-maps 整个目录复制到你的项目 .agents/skills/ 下，保留原有层级。打开 Codex，在提示词中使用 $urban-design-ten-maps。

示例：
> 使用 $urban-design-ten-maps，针对我的基地先建立数据与证据表，再按数据可得性绘制城市分析十图。请逐图注明尺度、来源、现状或规划状态、未知区域和需复核事项。

## 发布到 GitHub Pages
1. 新建公开 GitHub 仓库，将本目录全部文件上传到仓库根目录。
2. 仓库 Settings → Pages → Build and deployment，选择 Deploy from a branch，分支 main、目录 / (root)。
3. 等待 GitHub 显示网页地址，再把地址放到社媒帖子。页面使用相对路径，无需修改域名。

## 内容
- urban-design-ten-maps/SKILL.md：主工作流
- urban-design-ten-maps/references/：证据、图种与交付说明
- urban-design-ten-maps/scripts/：可选 OSM XML 转换脚本
- assets/：带“蓝水成长笔记”水印的案例封面

本仓库不包含原始任务书、CAD、聊天记录或账号信息。红山动物园封面仅用于展示十图输出。第 9 图为建筑覆盖率，不能替代法定容积率；第 10 图的可靠高度数据不足。所有图均应核对数据来源和现场情况。
