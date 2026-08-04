/* @refresh reload */
import { render } from 'solid-js/web'
import { Router, Route } from '@solidjs/router'
import './index.css'
import Login from './routes/Login'
import Dashboard from './routes/Dashboard'

const root = document.getElementById('root')

render(
  () => (
    <Router>
      <Route path="/" component={Login} />
      <Route path="/dashboard" component={Dashboard} />
    </Router>
  ),
  root!
)
