import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    _id: String,
    cid: String,
    url: String,
    symmetricKey: String,
    ownerId: String,
    isActive: Boolean,
  },
  { timestamps: true }
);

export default mongoose.model("file", schema);