# AGENTS.md 项目AI智能体全局约束
version: 1.0
update_time: 2026-06-22
project: {{项目名称}}
tech_stack: {{Java SpringBoot3 + Vue3 JS}}
support_agent: Codex, Qoder CN, Claude Code, Cursor

# 一、项目目录权限规则
## 可读写目录（允许自动修改代码）
/src
## 只读目录（仅查阅，修改前必须人工确认）
/docs
## 禁止读写目录
/.env、/node_modules、/target

# 二、全局运行校验命令
frontend_check: pnpm check && pnpm vitest run
backend_check: mvn clean compile test
python_check: pytest -v

# 三、统一编码强制规范
## 前端 Vue3 + JavaScript
1. 全部组件使用 <script setup> 语法糖；
2. 业务模块使用文件夹区分，组件名称与文件名一致；
2. 网络请求导入统一的 request.js 封装，组件不直接引入axios，位置位于 业务文件夹/*.route.js，；
3. jsconfig strict 严格模式，忽略类型必须附带注释；
4. 样式统一使用统一工具类，禁止重复写CSS；
   🚫 禁止全局挂载window、原生DOM操作、var声明变量。

## 后端 SpringBoot Java
1. 分层：Controller接收参数 → Service处理业务 → Mapper操作数据库；
2. 统一返回工具类 Result，code、msg、data三段式；
3. 请求入参全部增加 @NotBlank/@NotNull 校验；
4. 逻辑删除统一字段 is_deleted，无物理删除；
   🚫 禁止业务逻辑写在Controller，禁止硬编码配置信息。

# 四、智能体行为分级规则
## 【ALWAYS 必须执行】
1. 需求拆解后先输出执行计划，等待确认再写代码；
2. 代码完成后自动执行项目校验命令，修复所有报错；
3. 新增功能同步补充单元测试，覆盖核心分支；
4. 代码增加中文业务注释，复杂逻辑分步说明。

## 【ASK_FIRST 修改前询问】
- 新增/删除第三方依赖、修改pom/package.json；
- 调整数据库表、新增SQL迁移脚本；
- 批量重构、删除、重命名模块文件；
- 修改全局配置文件（yml、vite.config等）。

## 【NEVER 严禁操作】
1. 读取、编辑、输出任何密钥、token、数据库账号；
2. 生成包含明文隐私、内网地址的代码；
3. 自动git commit、推送代码、创建PR；
4. 擅自修改 /docs 业务说明文档；
5. 使用过时、废弃、存在安全漏洞的代码写法。

# 五、业务专属约束
{{此处替换项目特殊规则示例：
~~1. 所有后台接口必须校验登录token；~~
~~2. 分页统一使用 PageHelper，返回分页统一封装；~~
~~3. 前端弹窗统一使用全局MessageBox，不单独写弹窗逻辑；~~
   }}

# 六、输出固定格式
每次完成需求输出三段内容：
1. 变更文件清单；
2. 改动功能摘要；
3. 本地校验执行命令。