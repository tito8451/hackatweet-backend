const express = require("express");
const router = express.Router();

const User = require("../models/users");
const Tweet = require("../models/tweets");
const checkBody = require("../modules/ckeckBody");
router.post("/publish", async (req, res) => {
  //   console.log(req.body._id);
  try {
    const existingUser = await User.findOne({
      token: req.body.token,
    });
    // console.log(existingUser);
    if (!existingUser) {
      res.status(404).json({
        result: false,
        error: "you have to signin or signup befor to tweet",
      });
      return;
    } else {
      const newTweet = await new Tweet({
        description: req.body.description,
        owner: existingUser,
      });
      if (
        newTweet.description.length > 0 &&
        newTweet.description.length < 280
      ) {
        await newTweet.save();
        res.status(200).json({ result: true, data: newTweet });
        // console.log(newTweet._id);
      } else {
        res.status(404).json({
          result: false,
          message: "Empty field or max 280 characters",
        });
      }
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/all", async (req, res) => {
  //   console.log(req.query);
  //   console.log(req.query.token);
  try {
    const existingUser = await User.findOne({ token: req.query.token });
    // console.log(existingUser);
    if (!existingUser) {
      res.status(404).json({
        result: false,
        error: "User not found missing something or create an account",
      });
    } else {
      const dataOfTweets = await Tweet.find()
        .populate("owner", ["username", "firstname"])
        .populate("isLiked", ["username"])
        .sort({ dateField: "desc" });
      res.status(200).json({ result: true, tweets: dataOfTweets });
      console.log(dataOfTweets);
    }
  } catch (error) {
    res.status(400).json({ error: error.messages });
  }
});

router.get("/trends/:token", async (req, res) => {
  try {
    // Find the user by the token
    const user = await User.findOne({ token: req.params.token });

    if (!user) {
      res.status(404).json({ result: false, error: "User does not exist" });
      return;
    }

    // Find tweets with hashtags
    const tweets = await Tweet.find({ description: { $regex: /#/ } });

    const hashtags = [];

    // Loop through tweets to extract hashtags
    tweets.forEach((tweet) => {
      const tweetHashtags = tweet.description.match(/#(\w+)/g);

      if (tweetHashtags) {
        hashtags.push(...tweetHashtags);
      }
    });
    //! /#(\w+)/g est l'expression régulière utilisée.
    //? / : C'est le délimiteur de l'expression régulière.
    // ?# : Cela correspond à un caractère dièse (#) dans la chaîne. Les hashtags commencent généralement par #.
    //? (\w+) : C'est un groupe de capture qui correspond à un ou plusieurs caractères alphanumériques (lettres, chiffres ou soulignés). Le "+" signifie qu'il doit y avoir au moins un caractère alphanumérique après le dièse.
    //? / : C'est le délimiteur de fin de l'expression régulière.
    // ?g : C'est un drapeau qui indique à l'expression régulière de rechercher toutes les occurrences de cette correspondance dans la chaîne. "g" signifie "global".
    //? Donc, ce regex recherche toutes les occurrences de hashtags dans la description de chaque tweet. Si un ou plusieurs hashtags sont trouvés dans un tweet, ils sont stockés dans la variable tweetHashtags. Ensuite, ces hashtags sont ajoutés au tableau hashtags. Cela permet d'extraire efficacement tous les hashtags de chaque tweet pour les utiliser ultérieurement.
    // Calculate hashtag trends
    const trends = hashtags.reduce((trendMap, hashtag) => {
      trendMap.set(hashtag, (trendMap.get(hashtag) || 0) + 1);
      return trendMap;
    }, new Map());
    //? hashtags est un tableau qui contient une liste de hashtags extraits de différents tweets.

    //? .reduce((trendMap, hashtag) => {...}, new Map()) est une utilisation de la méthode reduce sur le tableau hashtags.

    //? trendMap est l'accumulateur, initialement de type new Map(). C'est là que les comptes des hashtags seront stockés.

    //? hashtag est l'élément actuel du tableau sur lequel nous itérons à travers la méthode reduce. Il représente un hashtag à un moment donné.

    //? trendMap.set(hashtag, (trendMap.get(hashtag) || 0) + 1); met à jour le compteur du hashtag dans le trendMap. Si le hashtag n'existe pas encore dans le trendMap, il est initialisé à 0, puis incrémenté de 1 à chaque occurrence.

    //? La méthode reduce renvoie le trendMap mis à jour après avoir parcouru tous les hashtags.
    // Sort trends by count
    const sortedTrends = Array.from(trends.entries()).sort(
      (a, b) => b[1] - a[1]
    );

    res.status(200).json({ result: true, trends: sortedTrends });
  } catch (error) {
    res.status(500).json({ result: false, error: "Internal server error" });
  }
});

router.get("/hashtag/:token/:query", async (req, res) => {
  try {
    const user = await User.findOne({ token: req.params.token });

    if (!user) {
      return res.status(404).json({ result: false, error: "User not found" });
    }

    const tweets = await Tweet.find({
      description: { $regex: new RegExp("#" + req.params.query, "i") },
    })
      .populate("owner", ["username", "firstName"])
      .populate("ifLiked", ["username"])
      .sort({ dateField: "desc" });

    res.json({ result: true, tweets });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ result: false, error: "An error occurred" });
  }
});

router.put("/ifLike", async (req, res) => {
  if (!checkBody(req.body, ["tweetById", "token"])) {
    res
      .status(404)
      .json({ result: false, error: "Missing parameters, please check it" });
    return;
  }
  const user = await User.findOne({ token: req.body.token });
  if (!user) {
    res.status(404).json({
      result: false,
      error: "can't click on like? did you register or have an account? ",
    });
    return;
  }
  const tweet = await Tweet.findById(req.body.tweetById);
  if (!tweet) {
    res.status(404).json({
      result: false,
      error: "Tweet maybe deleted or something wrong in this # or do not exist",
    });
    return;
  }
  if (tweet.ifLiked.includes(user._id)) {
    await Tweet.updateOne({ _id: tweet._id }, { $pull: { isLiked: user._id } });
    res.status(200).json({ result: true, message: "why?" });
  } else {
    await Tweet.updateOne({ _id: tweet._id }, { $push: { isLiked: user._id } });
    res.status(200).json({ result: true, message: "succesfully liked" });
  }
});

router.delete("/", async (req, res) => {
  try {
    if (!checkBody(req.body, ["token", "tweetById"])) {
      res.status(404).json({ result: false, error: "Tweet doesn't exist" });
      //   console.log(req.body.tweetById);
      //   console.log(req);
      return;
    }

    const user = await User.findOne({ token: req.body.token });

    if (!user) {
      res.status(404).json({ result: false, error: "User not found" });
      return;
    }

    const tweet = await Tweet.findById(req.body.tweetById).populate("owner");
    // console.log(String(user._id));
    // console.log(String(tweet.owner._id));
    if (!tweet) {
      //   console.log(tweet);
      res.status(404).json({ result: false, error: "No Tweet found" });
    } else if (String(tweet.owner._id) !== String(user._id)) {
      res.status(404).json({
        result: false,
        error: "It can be deleted only by the owner of the tweet",
      });
      return;
    }
    const deleteOneTweet = await Tweet.deleteOne({ _id: tweet._id });
    //   console.log(tweet._id);
    res.status(200).json({ result: true, tweet: deleteOneTweet });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }

  //   console.log(tweet);
});
module.exports = router;
