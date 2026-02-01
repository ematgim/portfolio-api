const path = require("path");
const fs = require("fs/promises");

class InMemoryCvRepository {
  constructor({ dataPath } = {}) {
    this.dataPath = dataPath || path.join(__dirname, "cvProfile.json");
  }

  async getProfile() {
    const raw = await fs.readFile(this.dataPath, "utf-8");
    return JSON.parse(raw);
  }
}

module.exports = { InMemoryCvRepository };
