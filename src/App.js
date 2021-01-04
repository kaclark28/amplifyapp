/* src/App.js */
import React, { useEffect, useState } from 'react'
import Amplify, { API, graphqlOperation, Storage } from 'aws-amplify'
import { createTodo, deleteTodo } from './graphql/mutations'
import { listTodos } from './graphql/queries'
import { withAuthenticator, AmplifySignOut } from '@aws-amplify/ui-react'

import awsExports from "./aws-exports";
Amplify.configure(awsExports);

const initialState = { name: '', description: '' }

const App = () => {
  const [formState, setFormState] = useState(initialState)
  const [todos, setTodos] = useState([])

  useEffect(() => {
    fetchTodos()
  }, [])

  function setInput(key, value) {
    setFormState({ ...formState, [key]: value })
  }

  async function fetchTodos() {
    try {
      const todoData = await API.graphql(graphqlOperation(listTodos))
      const todos = todoData.data.listTodos.items
      await Promise.all(todos.map(async todo => {
        if (todo.image) {
          const image = await Storage.get(todo.image);
          todo.image = image;
        }
        return todo;
      }))
      setTodos(todos)
    } catch (err) { console.log('error fetching todos') }
  }

  async function onChange(e) {
    if (!e.target.files[0]) return
    const file = e.target.files[0];
    setFormState({ ...formState, image: file.name });
    await Storage.put(file.name, file);
    fetchTodos();
  }

  async function addTodo() {
    try {
      if (!formState.name || !formState.description) return
      const todo = { ...formState }
      if (formState.image) {
        const image = await Storage.get(formState.image);
        formState.image = image;
      }
      await API.graphql(graphqlOperation(createTodo, {input: todo}))
      setTodos([...todos, todo])
      setFormState(initialState)
    } catch (err) {
      console.log('error creating todo:', err)
    }
  }

  async function removeTodo({ id }) {
    const newTodoArray = todos.filter(todo => todo.id !== id);
    setTodos(newTodoArray);
    await API.graphql({ query: deleteTodo, variables: { input: { id } }});
  }

  return (
    <div style={styles.container}>
      <h2>Amplify Todos</h2>
      <input
        onChange={event => setInput('name', event.target.value)}
        style={styles.input}
        value={formState.name}
        placeholder="Name"
      />
      <input
        onChange={event => setInput('description', event.target.value)}
        style={styles.input}
        value={formState.description}
        placeholder="Description"
      />
      <input
        type="file"
        onChange={onChange}
      />
      <button style={styles.button} onClick={addTodo}>Create Todo</button>
      {
        todos.map((todo, index) => (
          <div key={todo.id ? todo.id : index} style={styles.todo}>
            <p style={styles.todoName}>{todo.name}</p>
            <p style={styles.todoDescription}>{todo.description}</p>
            <button onClick={() => removeTodo(todo)}>Delete</button>

            {
              todo.image && <img alt={todo.name} src={todo.image} style={{width: 400}} />
            }
          </div>
        ))
      }
      <AmplifySignOut />
    </div>
  )
}

const styles = {
  container: { width: 400, margin: '0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 20 },
  todo: {  marginBottom: 15 },
  input: { border: 'none', backgroundColor: '#ddd', marginBottom: 10, padding: 8, fontSize: 18 },
  todoName: { fontSize: 20, fontWeight: 'bold' },
  todoDescription: { marginBottom: 0 },
  button: { backgroundColor: 'black', color: 'white', outline: 'none', fontSize: 18, padding: '12px 0px' }
}

export default withAuthenticator(App);