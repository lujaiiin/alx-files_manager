import dbClient from './db';

class FilesCollection {
  static async createFile(newFile) {
    const collection = dbClient.getCollection('files');
    const commandResult = await collection.insertOne(newFile);
    return commandResult.insertedId;
  }

  static async getFile(query) {
    const collection = dbClient.getCollection('files');
    const file = await collection.find(query).toArray();
    return file;
  }

  static async getPage(query, page) {
    const collection = dbClient.getCollection('files');
    const file = await collection
      .find(query, { skip: page * 20, limit: 20 })
      .toArray();
    return file;
  }

  static async updateFile(query, update) {
    const collection = dbClient.getCollection('files');
    await collection.updateOne(query, update);
  }
}

export default FilesCollection;
