/*
 * @Author: sp1ke 761066757@qq.com
 * @Date: 2026-06-11 10:23:39
 * @LastEditors: sp1ke 761066757@qq.com
 * @LastEditTime: 2026-06-12 14:09:36
 * @FilePath: \emergency_plan\src\modules\planHistory\planHistory.route.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import request from '@/utils/request'


// 查询当前待办任务
export const getPlanHistory = (data) => {
   return request({
    url: '/instHi/queryHistory',
    method: 'post',
    data: data
  })
}
