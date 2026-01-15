/*
 * @Author: sp1ke 761066757@qq.com
 * @Date: 2026-01-13 15:30:56
 * @LastEditors: sp1ke 761066757@qq.com
 * @LastEditTime: 2026-01-13 15:31:27
 * @FilePath: \emergency_plan\src\api\camera.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import request from '@/utils/request'

export const getCameraList = () => {
  return request({
    url: '/step/listAll',
    method: 'get',
  })
}
