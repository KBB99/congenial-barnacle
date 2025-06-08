import WebSocket from 'ws';

describe('WebSocket Integration Tests', () => {
  const wsUrl = process.env.WS_URL || 'ws://localhost:8080/ws';
  let ws: WebSocket;

  beforeEach((done) => {
    ws = new WebSocket(wsUrl);
    ws.on('open', () => done());
    ws.on('error', (error) => done(error));
  });

  afterEach((done) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
    ws.on('close', () => done());
  });

  test('WebSocket connection establishes successfully', (done) => {
    expect(ws.readyState).toBe(WebSocket.OPEN);
    done();
  });

  test('Can send and receive messages', (done) => {
    const testMessage = {
      type: 'ping',
      timestamp: Date.now()
    };

    ws.on('message', (data) => {
      const response = JSON.parse(data.toString());
      expect(response.type).toBe('pong');
      expect(response.timestamp).toBe(testMessage.timestamp);
      done();
    });

    ws.send(JSON.stringify(testMessage));
  });

  test('Receives world state updates', (done) => {
    const subscribeMessage = {
      type: 'subscribe',
      channel: 'world-updates',
      worldId: '550e8400-e29b-41d4-a716-446655440000'
    };

    ws.on('message', (data) => {
      const response = JSON.parse(data.toString());
      if (response.type === 'world-update') {
        expect(response).toHaveProperty('worldId');
        expect(response).toHaveProperty('agents');
        done();
      }
    });

    ws.send(JSON.stringify(subscribeMessage));
  });

  test('Receives agent position updates', (done) => {
    const subscribeMessage = {
      type: 'subscribe',
      channel: 'agent-updates',
      agentId: '660e8400-e29b-41d4-a716-446655440000'
    };

    ws.on('message', (data) => {
      const response = JSON.parse(data.toString());
      if (response.type === 'agent-update') {
        expect(response).toHaveProperty('agentId');
        expect(response).toHaveProperty('position');
        done();
      }
    });

    ws.send(JSON.stringify(subscribeMessage));
  });

  test('Receives memory stream updates', (done) => {
    const subscribeMessage = {
      type: 'subscribe',
      channel: 'memory-updates',
      agentId: '660e8400-e29b-41d4-a716-446655440000'
    };

    ws.on('message', (data) => {
      const response = JSON.parse(data.toString());
      if (response.type === 'memory-update') {
        expect(response).toHaveProperty('agentId');
        expect(response).toHaveProperty('memory');
        done();
      }
    });

    ws.send(JSON.stringify(subscribeMessage));
  });

  test('Handles connection errors gracefully', (done) => {
    const badWs = new WebSocket('ws://localhost:9999/invalid');
    
    badWs.on('error', (error) => {
      expect(error).toBeDefined();
      done();
    });
  });

  test('Handles invalid message format', (done) => {
    ws.on('message', (data) => {
      const response = JSON.parse(data.toString());
      if (response.type === 'error') {
        expect(response.message).toContain('Invalid message format');
        done();
      }
    });

    ws.send('invalid json');
  });

  test('Handles unsubscribe requests', (done) => {
    const unsubscribeMessage = {
      type: 'unsubscribe',
      channel: 'world-updates',
      worldId: '550e8400-e29b-41d4-a716-446655440000'
    };

    ws.on('message', (data) => {
      const response = JSON.parse(data.toString());
      if (response.type === 'unsubscribed') {
        expect(response.channel).toBe('world-updates');
        done();
      }
    });

    ws.send(JSON.stringify(unsubscribeMessage));
  });

  test('Maintains connection with heartbeat', (done) => {
    let heartbeatReceived = false;

    ws.on('message', (data) => {
      const response = JSON.parse(data.toString());
      if (response.type === 'heartbeat') {
        heartbeatReceived = true;
      }
    });

    // Wait for heartbeat (should come within 30 seconds)
    setTimeout(() => {
      expect(heartbeatReceived).toBe(true);
      done();
    }, 35000);
  }, 40000);
});