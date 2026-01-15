// Flowable Modeler 页面监听消息
window.addEventListener('message', function (e) {
  if (e.data.type === 'SYNC_STEPS_TO_MODELER') {
    const { steps } = e.data
    const canvas = window.editor.get('canvas')
    const elementFactory = window.editor.get('elementFactory')

    // 生成串行任务节点
    let x = 150,
      y = 100
    steps.forEach((step, index) => {
      const task = elementFactory.createShape({
        type: 'bpmn:UserTask',
        x: x + index * 200,
        y: y,
        name: step.stepName,
        businessObject: {
          stepId: step.id, // 绑定业务步骤ID
        },
      })
      canvas.addShape(task)
      // 生成连线
      if (index > 0) {
        const source = canvas.getRootElements()[index]
        const target = canvas.getRootElements()[index + 1]
        const connection = elementFactory.createConnection({
          type: 'bpmn:SequenceFlow',
          source: source,
          target: target,
        })
        canvas.addConnection(connection)
      }
    })
  }
  // 其他消息类型：GET_BPMN_XML / CLEAR_MODELER / REMOVE_NODE
})
