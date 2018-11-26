function xhrRequest (method, body, callback) {
  const xhr = new XMLHttpRequest()

  xhr.open(method, 'http://brotheroftux.org:8080/todos/e829011baf5b0fc39edda5a5337ba2f0')

  xhr.onreadystatechange = () => {
    if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200)
      callback(JSON.parse(xhr.responseText))
  }

  xhr.send(JSON.stringify(body))
}

const StateModule = {
  state: {
    todos: []
  },

  subscribers: [],

  mutations: {
    addTodo: (state, todo) => state.todos.push(todo),
    deleteTodo: (state, index) => state.todos.splice(index, 1),
    editTodo: (state, options) => {
      const idx = options.index
      state.todos[idx].text = options.hasOwnProperty('text') ? options.text : state.todos[idx].text
      state.todos[idx].done = options.hasOwnProperty('done') ? options.done : state.todos[idx].done
    },
    initTodos: (state, todoList) => state.todos = todoList,
  },

  actions: {
    addTodo: (context, todo) => {
      xhrRequest('POST', todo, data => {
        if (!data.error)
          context.commit('addTodo', todo)
      })
    },
    deleteTodo: (context, index) => {
      xhrRequest('DELETE', { index }, data => {
        if (!data.error)
          context.commit('deleteTodo', index)
      })
    },
    changeTodoDoneState: (context, index) => {
      const newDoneState = !context.state.todos[index].done

      xhrRequest('PUT', {
        index,
        done: newDoneState
      }, data => {
        if (!data.error) StateModule.commit('editTodo', { index, done: newDoneState })
      })
    },
    editTodo: (context, options) => {
      xhrRequest('PUT', options, data => {
        if (!data.error)
          context.commit('editTodo', options)
      })
    }
  },

  commit (mutation, payload) {
    this.mutations[mutation](this.state, payload)

    this.subscribers.forEach(subscriber => subscriber(this.state))

    // for (let subscriber of this.subscribers)
    //   subscriber(this.state)
  },

  dispatch (action, payload) {
    this.actions[action]({
      state: this.state,
      commit: this.commit.bind(this)
    }, payload)
  },

  subscribe (callback) {
    this.subscribers.push(callback)
  }
}

const $input = document.querySelector('#input')
const $form = document.querySelector('#form')
const $todos = document.querySelector('.todo-container')

function makeTodo (todo, index) {
  const element = document.createElement('div')

  element.classList.add('todo')
  if (todo.done) element.classList.add('done')
  
  const todoText = document.createElement('div')
  todoText.classList.add('todo-text')
  todoText.textContent = todo.text

  const actions = document.createElement('div')
  actions.classList.add('actions')

  const deleteActionContainer = document.createElement('div')
  deleteActionContainer.classList.add('action-container')

  const deleteAction = document.createElement('img')
  deleteAction.classList.add('action')
  deleteAction.src = 'delete.svg'

  const editActionContainer = document.createElement('div')
  editActionContainer.classList.add('action-container')

  const editAction = document.createElement('img')
  editAction.classList.add('action')
  editAction.src = 'edit.svg'

  deleteActionContainer.addEventListener('click', () => StateModule.dispatch('deleteTodo', index))

  editActionContainer.addEventListener('click', () => {
    makeTodoEditable({ todo: element, todoText }, index)
  })

  todoText.addEventListener('click', event => {
    if (!element.classList.contains('editable'))
      StateModule.dispatch('changeTodoDoneState', index)
  })

  deleteActionContainer.appendChild(deleteAction)
  editActionContainer.appendChild(editAction)

  actions.appendChild(editActionContainer)
  actions.appendChild(deleteActionContainer)
  element.appendChild(todoText)
  element.appendChild(actions)

  return element
}

function makeTodoEditable (domContext, index) {
  domContext.todoText.setAttribute('contenteditable', true)
  domContext.todo.classList.add('editable')

  domContext.todo.classList.remove('done')
  domContext.todoText.focus()

  const editingActions = document.createElement('div')
  editingActions.classList.add('actions')
  editingActions.classList.add('editor')

  const confirmActionContainer = document.createElement('div')
  const cancelActionContainer = document.createElement('div')

  confirmActionContainer.classList.add('action-container')
  cancelActionContainer.classList.add('action-container')

  const confirmAction = document.createElement('img')
  const cancelAction = document.createElement('img')

  confirmAction.classList.add('action')
  cancelAction.classList.add('action')

  confirmAction.src = 'check.svg'
  cancelAction.src = 'delete.svg'

  confirmActionContainer.appendChild(confirmAction)
  cancelActionContainer.appendChild(cancelAction)

  confirmActionContainer.addEventListener('click', () => StateModule.dispatch('editTodo', {
    index, 
    text: domContext.todoText.textContent
  }))

  cancelActionContainer.addEventListener('click', () => render(StateModule.state))

  editingActions.appendChild(confirmActionContainer)
  editingActions.appendChild(cancelActionContainer)

  domContext.todo.appendChild(editingActions)
}

function render (state) {
  $todos.innerHTML = ''

  state.todos.forEach((todo, index) => $todos.appendChild(makeTodo(todo, index)))
}

StateModule.subscribe(render)

$form.addEventListener('submit', event => {
  event.preventDefault()

  if ($input.value) {
    StateModule.dispatch('addTodo', {
      text: $input.value,
      done: false
    })

    $input.value = ''
  }
})

xhrRequest('GET', null, data => {
  if (!data.error)
    StateModule.commit('initTodos', data.response)
})