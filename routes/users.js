var express = require("express");
var router = express.Router();
require("../models/connection");
const uid2 = require("uid2");
const bcrypt = require("bcrypt");
const User = require("../models/users");
const checkBody = require("../modules/ckeckBody");
/* GET users listing. */

// console.log(checkBody);
router.post("/signup", async (req, res) => {
  try {
    if (req.body.username[0] !== "@" || req.body.username.length < 4) {
      // console.log("blabla2");
      res.json({
        result: false,
        error:
          "please check it! The first character in your username must be a @ and absolutely more than 4 characters",
      });
      return;
    }
    // console.log(req.body.firstname);
    if (!checkBody(req.body, ["firstname", "username", "password"])) {
      // console.log("blabla");

      res.json({ result: false, error: "Missing parameters or empty fields " });
      return;
    }

    const ifExistingUser = await User.findOne({ username: req.body.username });
    // console.log(existingUser);
    if (!ifExistingUser) {
      const hash = bcrypt.hashSync(req.body.password, 10);

      const newUserByName = new User({
        firstname: req.body.firstname,
        username: req.body.username,
        password: hash,
        token: uid2(32),
      });
      await newUserByName.save();
      // console.log(newUserByName.token);
      res.status(200).json({ result: true, token: newUserByName.token });
    } else {
      res.json({ result: false, error: "User already exists" });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/signin", async (req, res) => {
  try {
    if (!checkBody(req.body, ["firstname", "username", "password"])) {
      // console.log("blabla");

      res.json({ result: false, error: "Missing parameters or empty fields " });
      return;
    }
    if (req.body.username[0] !== "@" || req.body.username.length < 4) {
      // console.log("blabla2");
      res.json({
        result: false,
        error:
          "please check it! The first character in your username must be a @ and you absolutely forgot more than 4 characters for sure go to sign up if you don't have an account",
      });
      return;
    }
    const existingUser = await User.findOne({ username: req.body.username });
    // console.log(existingUser);
    if (
      existingUser &&
      bcrypt.compareSync(req.body.password, existingUser.password)
    ) {
      res.status(200).json({ result: true, token: existingUser.token });
    } else {
      res
        .status(404)
        .json({ result: false, error: "User not found or wrong password" });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
