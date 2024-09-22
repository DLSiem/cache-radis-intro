import { create } from "domain";
import express, { Express, NextFunction, Request, Response } from "express";
import fetch from "node-fetch";
import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

const app: Express = express();

const PORT = process.env.PORT || 5000;
const REDIS_PORT = process.env.REDIS_PORT || 6379;

const client = createClient({
  url: `redis://localhost:${REDIS_PORT}`,
})
  .on("error", (error) => {
    console.error(error);
  })
  .connect();

app.use(express.json());
const sendResponse = (username: string, repos: number) => {
  return `<h1> ${username} has ${repos} public repositories on GitHub</h1>`;
};

const getRepo = async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const response = await fetch(`https://api.github.com/users/${username}`);
    const data: any = await response.json();

    const repos = data.public_repos;
    console.log(repos);

    // Set data to Redis
    (await client).set(username, repos, {
      EX: 20,
    });

    res.send(sendResponse(username, repos));
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

// cache middleware
const cache = async (req: Request, res: Response, next: NextFunction) => {
  const { username } = req.params;
  console.log(username);
  try {
    const getData = (await client).get(username);

    const data = await getData;

    if (data !== null) {
      console.log("Data from cache");
      res.send(sendResponse(username, Number(data)));
    } else {
      next();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: (error as Error).message });
  }
};

app.get("/repo/:username", cache, getRepo);

app.get("/", (req: Request, res: Response) => {
  res.send("Hello World!");
});

app.listen(5000, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
