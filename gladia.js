import { exit } from "process";
import WebSocket from "ws";

const ERROR_KEY = "error";
const TYPE_KEY = "type";
const TRANSCRIPTION_KEY = "transcription";
const LANGUAGE_KEY = "language";
const SAMPLE_RATE = 48_000;

// Your Gladia Token
const gladiaKey = process.argv[2];
if (!gladiaKey) {
  console.error(
    "You must provide a gladia key. Go to app.gladia.io to get one."
  );
  exit(1);
} else {
  console.log("Using the gladia key: " + gladiaKey);
}

const gladiaUrl = "wss://api.gladia.io/audio/text/audio-transcription";

// Track occurrences of "TinkerHub"
let tinkerHubCount = 0;

export function initGladiaConnection(userName) {
  const socket = new WebSocket(gladiaUrl);

  socket.on("message", (event) => {
    if (event) {
      const utterance = JSON.parse(event.toString());
      if (Object.keys(utterance).length !== 0) {
        if (ERROR_KEY in utterance) {
          console.error(`${utterance[ERROR_KEY]}`);
          socket.close();
        } else {
          if (utterance && utterance[TRANSCRIPTION_KEY]) {
            const transcription = utterance[TRANSCRIPTION_KEY];
            console.log(
              `${userName} [${utterance[TYPE_KEY]}] (${utterance[LANGUAGE_KEY]}): ${transcription}`
            );

            // Count occurrences of "TinkerHub"
            const matches = transcription.match(/\bTinker Hub\b/gi);
            if (matches) {
              tinkerHubCount += matches.length;
              console.log(`"TinkerHub" mentioned ${tinkerHubCount} times.`);

              // Send a message if "TinkerHub" is mentioned 5 times
              if (tinkerHubCount >= 5) {
                console.log("stopppp");
                tinkerHubCount = 0; // Reset the counter if needed
              }
            }
          }
        }
      }
    } else {
      console.log("Empty message received.");
    }
  });

  socket.on("error", (error) => {
    console.log(error.message);
  });

  socket.on("close", () => {
    console.log("Connection closed.");
  });

  socket.on("open", async () => {
    const configuration = {
      x_gladia_key: gladiaKey,
      language_behaviour: "automatic single language",
      sample_rate: SAMPLE_RATE,
      // "model_type": "accurate" <- Slower but more accurate model, useful if you need precise addresses for example.
    };
    socket.send(JSON.stringify(configuration));
  });

  return socket;
}

export function sendDataToGladia(chunkPCM, socket) {
  const base64 = chunkPCM.toString("base64");

  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ frames: base64 }));
  } else {
    console.log("WebSocket ready state is not [ OPEN ]");
  }
}
