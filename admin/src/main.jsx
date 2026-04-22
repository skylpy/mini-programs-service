import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// 将后台管理应用挂载到页面根节点。
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
