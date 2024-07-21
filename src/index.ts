const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static(path.join(__dirname, "../public")));

app.get("/", function (req, res) {
  res.send("Hello World");
});
server.listen(3000, () => {
  console.log("Server listening on port 3000");
});

// Store users and groups
const users = {};
const groups = {};

io.on("connection", (socket) => {
  console.log("a user connected:", socket.id);

  // Handle user registration
  socket.on("register", (username) => {
    users[username] = socket.id;
    socket.username = username;
    console.log(`User registered: ${username}`);
  });

  // Handle joining a group
  socket.on("joinGroup", (group) => {
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(socket.id);
    socket.join(group);
    console.log(`User ${socket.username} joined group: ${group}`);
    socket
      .to(group)
      .emit("message", `User ${socket.username} has joined the group`);
  });

  // Handle leaving a group
  socket.on("leaveGroup", (group) => {
    if (groups[group]) {
      groups[group] = groups[group].filter((id) => id !== socket.id);
      socket.leave(group);
      console.log(`User ${socket.username} left group: ${group}`);
      socket
        .to(group)
        .emit("message", `User ${socket.username} has left the group`);
    }
  });

  // Handle sending a private message
  socket.on("privateMessage", ({ to, message }) => {
    const recipientSocketId = users[to];
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("privateMessage", {
        from: socket.username,
        message,
      });
      console.log(
        `Private message from ${socket.username} to ${to}: ${message}`
      );
    }
  });

  // Handle sending a group message
  socket.on("groupMessage", ({ group, message }) => {
    io.to(group).emit("groupMessage", { from: socket.username, message });
    console.log(
      `Group message from ${socket.username} to ${group}: ${message}`
    );
  });

  socket.on("disconnect", () => {
    console.log("user disconnected:", socket.id);
    if (socket.username) {
      delete users[socket.username];
    }
  });
});
