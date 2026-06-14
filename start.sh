#!/bin/bash
echo "启动淘宝店铺信息查询服务..."

echo "后端启动中..."
cd /workspace/taobao-shop-query/backend && python3 server.py &
BACKEND_PID=$!

sleep 2

echo "前端启动中..."
cd /workspace/taobao-shop-query/frontend && npx vite --host 0.0.0.0 --port 3002 &
FRONTEND_PID=$!

echo "后端 PID: $BACKEND_PID, 前端 PID: $FRONTEND_PID"
echo "前端访问: http://localhost:3002"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
