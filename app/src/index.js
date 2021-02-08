var express = require("express");
var request = require("request");
var bodyParser = require("body-parser");
const slackValidateRequest = require("validate-slack-request");
const ConfigLoader = require("./helpers/config-loader");

var app = express();
app.use(bodyParser.urlencoded({ extended: true }));

const PORT = 4390;

app.listen(PORT, function () {
  // Callback triggered when server is successfully listening. Hurray!
  console.log("Server listening on: http://localhost:%s", PORT);
});

app.get("/", function (req, res) {
  res.send("Ngrok is working! Path hit: " + req.url);
});

app.get("/oauth", function (req, res) {
  // When a user authorizes an app, a code query parameter is passed on the oAuth endpoint. If that code is not there, we respond with an error message
  if (!req.query.code) {
    res.status(500);
    res.send({ Error: "Looks like we're not getting code." });
    console.log("Looks like we're not getting code.");
  } else {
    // If it's there...

    // We'll do a GET call to Slack's `oauth.access` endpoint, passing our app's client ID, client secret, and the code we just got as query parameters.
    request(
      {
        url: "https://slack.com/api/oauth.access", //URL to hit
        qs: {
          code: req.query.code,
          client_id: ConfigLoader.getSecret("client_id"),
          client_secret: ConfigLoader.getSecret("client_secret"),
        }, //Query string data
        method: "GET", //Specify the method
      },
      function (error, _, body) {
        if (error) {
          console.log(error);
        } else {
          res.json(body);
        }
      }
    );
  }
});

// Route the endpoint that our slash command will point to and send back a simple response to indicate that ngrok is working
app.post("/command", function (req, res) {
  // this is where the custom stuff starts

  if (slackValidateRequest(ConfigLoader.getSecret("slack_secret"), req)) {
    dealWithRequest(req, res);
  } else {
    console.log("Request is not from slack");
  }
});

function dealWithRequest(req, res) {
  console.log("body: ", req.body);
  console.log("text: ", req.body.text);
  console.log("user_id: ", req.body.user_id);
  console.log("team_id: ", req.body.team_id);
  console.log("channel_id: ", req.body.channel_id);

  const command = req.body.text.toLowerCase();
  if (command.startsWith("add")) {
    addUsersToRotation(req, res);
  } else if (command.startsWith("delete")) {
    deleteRotation(req, res);
  } else if (command.startsWith("create")) {
    createRotation(req, res);
  } else if (command.startsWith("remove")) {
    removeUsersFromRotation(req, res);
  } else if (command.startsWith("schedule")) {
    scheduleRotation(req, res);
  } else {
    res.send({
      response_type: "in_channel",
      text: "Your Robin is up and chirping!",
    });
  }
}

function createRotation(req, res) {
  // store rotation name to channel_id (store channel name too)
  // enforce unique rotation names by channel
  const rotationName = req.body.text.split(" ")[1];
  const channel = `<#${req.body.channel_id}|${req.body.channel_name}>`;
  res.send({
    response_type: "in_channel",
    text: `Added ${rotationName} to ${channel}`,
  });
}

function deleteRotation(req, res) {
  // find rotation's id for this channel and delete it
  // soft delete rotation id
  const rotationName = req.body.text.split(" ")[1];
  const channel = `<#${req.body.channel_id}|${req.body.channel_name}>`;
  res.send({
    response_type: "in_channel",
    text: `Removed ${rotationName} from ${channel}`,
  });
}

function addUsersToRotation(req, res) {
  // store users to rotation
  const text = req.body.text;
  const splitByAdd = text.split("add");
  const splitByTo = splitByAdd[1].split("to");
  const users = splitByTo[0]
    .trim()
    .split(" ")
    .map((user) => user.trim());
  const rotation = splitByTo[1].trim();
  res.send({
    response_type: "in_channel",
    text: `Added ${users.join(" ")} to ${rotation}`,
  });
}

function removeUsersFromRotation(req, res) {
  // remove users from rotation
  const text = req.body.text;
  const splitByRemove = text.split("remove");
  const splitByFrom = splitByRemove[1].split("from");
  const users = splitByFrom[0]
    .trim()
    .split(" ")
    .map((user) => user.trim());
  const rotation = splitByFrom[1].trim();
  res.send({
    response_type: "in_channel",
    text: `Removed ${users.join(" ")} from ${rotation}`,
  });
}

function scheduleRotation(req, res) {
  const text = req.body.text;
  const splitBySchedule = text.split("schedule");
  const splitByEvery = splitBySchedule[1].split("every");
  const rotationName = splitByEvery[0].trim();
  const cadence = splitByEvery[1].trim();
  res.send({
    response_type: "in_channel",
    text: `${rotationName} scheduled to be every ${cadence}`,
  });
}
