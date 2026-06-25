<!--
 * @Author: sp1ke 761066757@qq.com
 * @Date: 2026-06-25 10:34:52
 * @LastEditors: sp1ke 761066757@qq.com
 * @LastEditTime: 2026-06-25 10:46:57
 * @FilePath: \emergency_plan\src\modules\README.md
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
### 接口协议说明

#### 概述
- 相关界面接口目前使用HTTP协议，后续需要改为与壳通信的接口协议
- 所有接口统一使用通用接口（类似SCS的通用接口 UnifiedProcess）

#### 数据结构定义

##### 返回码枚举
```protobuf
enum Result {
  // 成功
  OK = 0;
  // 失败
  NG = 1;
}
```

##### 统一请求结构
```protobuf
// 统一请求参数
message EpUnifiedRequest {
  // 标识码，用于区分不同的业务操作类型
  string udt = 1;
  // 请求数据，包含具体业务参数的JSON字符串
  string data = 2;
}
```

##### 统一响应结构
```protobuf
// 统一响应参数
message EpUnifiedResponse {
  // 返回码，标识请求处理结果
  Result code = 1;
  // 返回消息，包含处理结果的详细描述
  string msg = 2;
  // 响应数据，当code为OK时返回业务数据的JSON字符串，失败时为空
  string data = 3;
}
```

#### 服务定义

##### 应急预案服务
```protobuf
// 应急预案服务定义
service EmergencyPlanService {
  // 应急预案统一处理接口
  // 通过udt标识码区分不同业务操作，data参数承载具体业务数据
  rpc epUnifiedProcess(EpUnifiedRequest) returns (EpUnifiedResponse) {}
}
```

#### 接口调用说明
- **udt标识码**: 用于标识不同的业务操作接口
- **data字段**: 包含具体业务参数的JSON字符串，根据不同udt值确定具体的数据结构
- **返回处理**: 根据code字段判断请求是否成功，msg字段提供详细信息，data字段包含响应数据



### 详细接口文档见飞书！！！