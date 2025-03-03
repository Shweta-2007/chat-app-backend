const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authRoutes = require("./routes/auth");
const messageRoutes = require("./routes/messages");
const app = express();
const socket = require("socket.io");
require("dotenv").config();

app.use(cors());
app.use(express.json());

console.log("Connecting to:", process.env.MONGO_URL);
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log("DB Connection Successful");
  })
  .catch((err) => {
    console.error("DB Connection Error:", err.message);
  });

app.get("/ping", (_req, res) => {
  return res.json({ msg: "Ping Successful" });
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

app.get("/api/avatar/:seed", async (req, res) => {
  try {
    const { seed } = req.params;
    const response = await axios.get(`https://api.multiavatar.com/${seed}`, {
      headers: { Accept: "image/svg+xml" }, // Ensure correct format
    });
    res.setHeader("Content-Type", "image/svg+xml"); // Set correct response type
    res.send(response.data);
  } catch (error) {
    console.error("Error fetching avatar:", error.message); // Log error for debugging
    res.status(500).send("Error fetching avatar");
  }
});

const server = app.listen(process.env.PORT, () =>
  console.log(`Server started on ${process.env.PORT}`)
);
const io = socket(server, {
  cors: {
    // origin: "http://localhost:3000",
    origin: "https://connectly-chat-now.netlify.app",
    credentials: true,
  },
});

global.onlineUsers = new Map();
io.on("connection", (socket) => {
  global.chatSocket = socket;
  socket.on("add-user", (userId) => {
    onlineUsers.set(userId, socket.id);
  });

  socket.on("send-msg", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("msg-recieve", data.msg);
    }
  });

  socket.on("typing", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    if (sendUserSocket) {
      socket
        .to(sendUserSocket)
        .emit("user-typing", { from: data.from, isTyping: true });
    }
  });

  socket.on("stop-typing", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    if (sendUserSocket) {
      socket
        .to(sendUserSocket)
        .emit("user-typing", { from: data.from, isTyping: false });
    }
  });
});
