# Jellyfin OSD Display Mode

Jellyfin **12.1** 服务端插件：在播放页设置菜单里增加「菜单显示」开关（移入 / 单击），并且不再隐藏 `#reactRoot`，所以 12.x 顶部返回按钮仍然可用。

油猴脚本在 12.1 里经常注入不到设置菜单。插件会在每次请求 `index.html` 时注入客户端脚本，所有浏览器、客户端网页都会生效。

## 安装

1. 下载 `OsdDisplayMode_1.0.0.0.zip`，解压后得到：

   ```
   OsdDisplayMode/
     Jellyfin.Plugin.OsdDisplayMode.dll
     meta.json
   ```

2. 把整个 `OsdDisplayMode` 文件夹放到 Jellyfin 插件目录：

   - Docker：`/config/plugins/OsdDisplayMode/`
   - Linux：`/var/lib/jellyfin/plugins/OsdDisplayMode/`
   - 也可以在仪表盘 → 插件 里上传 zip（若你的 12.1 支持本地上传）

3. **重启 Jellyfin**
4. 打开任意网页端，强制刷新（Ctrl/Cmd + F5）
5. 播放视频 → 底部齿轮 **设置** → 「播放信息」下面应出现 **菜单显示**

仪表盘 → 插件 → OSD Display Mode 可以开关插件，以及设置尚未保存过偏好时的默认模式。

## 行为

- **移入**：不干预，沿用 Jellyfin 原有悬停 / 自动隐藏
- **单击**：点画面空白处显示或隐藏顶栏和控制条；双击暂停 / 播放
- 偏好保存在浏览器 `localStorage.yami_menu_display`

## 编译

需要 .NET 10 SDK，并针对 Jellyfin 12.1.0：

```bash
dotnet build -c Release Jellyfin.Plugin.OsdDisplayMode/Jellyfin.Plugin.OsdDisplayMode.csproj
```

产物在 `Jellyfin.Plugin.OsdDisplayMode/bin/Release/net10.0/`。
