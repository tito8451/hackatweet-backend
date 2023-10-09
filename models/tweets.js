const mongoose = require("mongoose");

const tweetSchema = mongoose.Schema({
  description: String,
  dateField: {
    type: Date,
    default: Date.now,
  },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
  ifLiked: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },
  ],
});

const Tweet = mongoose.model("tweets", tweetSchema);
module.exports = Tweet;
