const https = require("https");
const readline = require("readline");
const fs = require("fs");

const apiKey = "open ai key here";
const prompt = "You are a helpful assistant.";
const apiUrl = "api.openai.com";
const apiPath = "/v1/chat/completions";
const dbFilePath = "./db.json";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  underscore: "\x1b[4m",
  blink: "\x1b[5m",
  reverse: "\x1b[7m",
  hidden: "\x1b[8m",
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

const status = {
  success: `${colors.green}${colors.bright}[Success]${colors.reset}`,
  error: `${colors.red}${colors.bright}[Error]${colors.reset}`,
};

function getUserInput() {
  return new Promise((resolve) => {
    rl.question(`${colors.blue}> You:${colors.reset} `, (userInput) => {
      resolve(userInput);
    });
  });
}

function sendRequest(input) {
  const postData = JSON.stringify({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: prompt,
      },
      {
        role: "user",
        content: input,
      },
    ],
  });

  const options = {
    method: "POST",
    hostname: apiUrl,
    path: apiPath,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    maxRedirects: 20,
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = [];

      res.on("data", (chunk) => {
        chunks.push(chunk);
      });

      res.on("end", () => {
        const body = Buffer.concat(chunks);
        resolve(body.toString());
      });

      res.on("error", (error) => {
        reject(error);
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

function saveToDb(messages) {
  try {
    fs.writeFileSync(dbFilePath, JSON.stringify(messages, null, 2));
  } catch (error) {
    console.error(
      `${status.error} Error saving to the database: ${error.message}`,
    );
  }
}

async function main() {
  console.log(
    `${colors.green}${colors.bright}[ChatGPT CLI]${colors.reset} - Type "exit" to quit`,
  );

  let messages = [];
  try {
    messages = JSON.parse(fs.readFileSync(dbFilePath, "utf-8"));
  } catch (error) {
    console.error(
      `${status.error} Error reading from the database: ${error.message}`,
    );
  }

  while (true) {
    const userInput = await getUserInput();
    if (userInput.toLowerCase() === "exit") {
      console.log(`${colors.yellow}[Goodbye!]${colors.reset}`);
      rl.close();
      return;
    }

    try {
      const response = await sendRequest(userInput);
      const responseObj = JSON.parse(response);
      const aiMessage = responseObj.choices[0].message.content;

      const message = {
        user: userInput,
        ai: aiMessage,
        timestamp: new Date().toISOString(),
      };

      messages.push(message);

      saveToDb(messages);

      console.log(
        `${colors.magenta}${colors.bright}> AI:${colors.reset} ${aiMessage}`,
      );
    } catch (error) {
      console.error(
        `${status.error} Error sending request to OpenAI: ${error.message}`,
      );
    }
  }
}

main();
