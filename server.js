// Require the necessary modules
const http = require('http');
const express = require('express');
const cors = require('cors');
const socketio = require('socket.io');
const fs = require('fs');

// Create an Express app
const app = express();

// Use CORS middleware to allow all origins
app.use(cors({
	origin: '*'
  }));

// Create a Node.js HTTP server using the Express app
const server = http.createServer(app);

// Create a Socket.IO instance by passing the HTTP server
const io = socketio(server);

var history = [];

// Handle Socket.IO connection
io.on('connection', socket => {
	console.log('Client connected');

	history = history.filter((x) => {
		return x[0] >= Date.now() - 43200000; // 12h
	});
	history.forEach((el) => {
		socket.emit('competitor_update', el[1]);
	});

	// Handle 'competitor_update' event
	socket.on('competitor_update', message => {
		console.log('Received competitor update:', message);

		// Process the update message and possibly update the data
		history.push([Date.now(), message]);

		// Then broadcast the updated data to other clients
		socket.broadcast.emit('competitor_update', message);

		fs.appendFile('startlog.txt', JSON.stringify(message)+"\r\n", function (err) {
			console.log('Saved!');
		});
	});

	// Handle disconnection
	socket.on('disconnect', () => {
		console.log('Client disconnected');
	});
});

// Endpoint to handle CORS preflight requests
app.options('*', cors());

// Start the server and listen on a specified port
const PORT = process.env.PORT || 3077;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});