const io = require('socket.io-client');

// Get token from command line argument
const token = process.argv[2];
const workspaceId = process.argv[3];

if (!token || !workspaceId) {
  console.log('Usage: node test-socketio.js <TOKEN> <WORKSPACE_ID>');
  console.log('Example: node test-socketio.js eyJhbGci... 6acb4978-9f64-417c-bc21-a8ac5b72ce27');
  process.exit(1);
}

console.log('🔌 Connecting to Socket.io server...');
console.log('   URL: http://localhost:3000');
console.log('   Workspace ID:', workspaceId);
console.log('   Token:', token.substring(0, 30) + '...\n');

// Connect to Socket.io server
const socket = io('http://localhost:3000', {
  auth: {
    token: token,
  },
  transports: ['websocket', 'polling'],
  reconnection: false, // Don't auto-reconnect for testing
  timeout: 5000,
});

socket.on('connect', () => {
    console.log('✅ Connected to server');
    console.log('Socket ID:', socket.id);
    
    // Join workspace
    console.log('\n📤 Sending workspace:join event...');
    socket.emit('workspace:join', { workspaceId: workspaceId });
  });

  socket.on('workspace:users', (data) => {
    console.log('\n✅ Received workspace:users event:');
    console.log(JSON.stringify(data, null, 2));
  });

  socket.on('user:joined', (data) => {
    console.log('\n👤 User joined:', data.user.email);
    console.log(JSON.stringify(data, null, 2));
  });

  socket.on('user:left', (data) => {
    console.log('\n👋 User left:', data.user.email);
    console.log(JSON.stringify(data, null, 2));
  });

  socket.on('file:changed', (data) => {
    console.log('\n📝 File changed:', data.fileName);
    console.log(JSON.stringify(data, null, 2));
  });

socket.on('connect_error', (error) => {
  console.error('\n❌ Connection error:', error.message);
  console.error('\n🔍 Troubleshooting:');
  console.error('1. Make sure the server is running: npm run dev');
  console.error('2. Verify the token is valid and not expired');
  console.error('3. Check server logs for authentication errors');
  console.error('\n💡 Common issues:');
  console.error('   - Token expired (get a new one: curl -X POST http://localhost:3000/api/v1/auth/login -H "Content-Type: application/json" -d \'{"email":"user@example.com","password":"password123"}\')');
  console.error('   - Server not running');
  console.error('   - Wrong port (should be 3000)');
  console.error('\nFull error details:', error);
  process.exit(1);
});

  socket.on('disconnect', (reason) => {
    console.log('\n❌ Disconnected:', reason);
  });

  // Send file change event after 2 seconds
  setTimeout(() => {
    if (socket.connected) {
      console.log('\n📤 Sending file:change event...');
      socket.emit('file:change', {
        workspaceId: workspaceId,
        fileId: 'test-file-123',
        fileName: 'test.js',
        changeType: 'update',
        content: "console.log('Hello from Socket.io!');",
      });
    }
  }, 2000);

  // Leave workspace after 5 seconds
  setTimeout(() => {
    if (socket.connected) {
      console.log('\n📤 Sending workspace:leave event...');
      socket.emit('workspace:leave', { workspaceId: workspaceId });
    }
  }, 5000);

  // Disconnect after 10 seconds
  setTimeout(() => {
    if (socket.connected) {
      console.log('\n👋 Disconnecting...');
      socket.disconnect();
    }
    process.exit(0);
  }, 10000);

