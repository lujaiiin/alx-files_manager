import mongodb from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import mime from 'mime-types';
import UserCollection from '../utils/users';
import redisClient from '../utils/redis';
import FilesCollection from '../utils/files';

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    const id = token ? await redisClient.get(`auth_${token}`) : null;
    if (!id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const user = await UserCollection.getUser({
      _id: mongodb.ObjectId(id),
    });
    if (!user || user.length === 0) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const {
      name, type, parentId, isPublic, data,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }
    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }
    if (!data && type !== 'folder') {
      return res.status(400).json({ error: 'Missing data' });
    }
    if (parentId) {
      const parent = await FilesCollection.getFile({
        _id: mongodb.ObjectId(parentId),
      });
      if (!parent || parent.length === 0) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (parent[0].type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }
    if (type === 'folder') {
      const fileId = await FilesCollection.createFile({
        userId: mongodb.ObjectId(id),
        name,
        type,
        parentId: parentId ? mongodb.ObjectId(parentId) : 0,
        isPublic: !!isPublic,
      });
      return res.status(201).json({
        id: fileId,
        userId: id,
        name,
        type,
        isPublic: !!isPublic,
        parentId: parentId || 0,
      });
    }
    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
    }
    const fileName = uuidv4();
    const fileId = await FilesCollection.createFile({
      name,
      userId: mongodb.ObjectId(id),
      type,
      parentId: parentId ? mongodb.ObjectId(parentId) : 0,
      isPublic: !!isPublic,
      localPath: `${folderPath}/${fileName}`,
    });
    const filePath = `${folderPath}/${fileName}`;
    const dataBuffer = Buffer.from(data, 'base64');
    fs.writeFileSync(filePath, dataBuffer);
    return res.status(201).json({
      id: fileId,
      userId: id,
      name,
      type,
      isPublic: !!isPublic,
      parentId: parentId || 0,
    });
  }

  static async getShow(req, res) {
    const { id } = req.params;
    const token = req.headers['x-token'];
    const userId = token ? await redisClient.get(`auth_${token}`) : null;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const user = await UserCollection.getUser({
      _id: mongodb.ObjectId(userId),
    });
    if (!user || user.length === 0) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const file = await FilesCollection.getFile({
      _id: mongodb.ObjectId(id),
      userId: mongodb.ObjectId(userId),
    });
    if (!file || file.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.status(200).json({
      id: file[0]._id,
      userId: file[0].userId,
      name: file[0].name,
      type: file[0].type,
      isPublic: !!file[0].isPublic,
      parentId: file[0].parentId,
    });
  }

  static async getIndex(req, res) {
    const token = req.headers['x-token'];
    const { parentId, page } = req.query;
    const userId = token ? await redisClient.get(`auth_${token}`) : null;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const user = await UserCollection.getUser({
      _id: mongodb.ObjectId(userId),
    });
    if (!user || user.length === 0) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const id = !parentId || parentId === '0' ? 0 : mongodb.ObjectId(parentId);
    const query = {
      parentId: id,
    };
    const files = await FilesCollection.getPage(query, page || 0);

    return res.status(200).json(
      files.map((file) => ({
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: !!file.isPublic,
        parentId: file.parentId,
      })),
    );
  }

  static async putPublish(req, res) {
    const token = req.headers['x-token'];
    const { id } = req.params;
    const userId = token ? await redisClient.get(`auth_${token}`) : null;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const user = await UserCollection.getUser({
      _id: mongodb.ObjectId(userId),
    });
    if (!user || user.length === 0) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const query = {
      _id: mongodb.ObjectId(id),
      userId: mongodb.ObjectId(userId),
    };
    const file = await FilesCollection.getFile(query);
    if (!file || file.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    await FilesCollection.updateFile(
      { _id: file[0]._id },
      { $set: { isPublic: true } },
    );
    return res.status(200).json({
      id: file[0]._id,
      userId: file[0].userId,
      name: file[0].name,
      type: file[0].type,
      isPublic: true,
      parentId: file[0].parentId,
    });
  }

  static async putUnpublish(req, res) {
    const token = req.headers['x-token'];
    const { id } = req.params;
    const userId = token ? await redisClient.get(`auth_${token}`) : null;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const user = await UserCollection.getUser({
      _id: mongodb.ObjectId(userId),
    });
    if (!user || user.length === 0) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const query = {
      _id: mongodb.ObjectId(id),
      userId: mongodb.ObjectId(userId),
    };
    const file = await FilesCollection.getFile(query);
    if (!file || file.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    await FilesCollection.updateFile(
      { _id: file[0]._id },
      { $set: { isPublic: false } },
    );
    return res.status(200).json({
      id: file[0]._id,
      userId: file[0].userId,
      name: file[0].name,
      type: file[0].type,
      isPublic: false,
      parentId: file[0].parentId,
    });
  }

  static async getFile(req, res) {
    const { id } = req.params;
    const token = req.headers['x-token'];
    const userId = token ? await redisClient.get(`auth_${token}`) : null;
    const file = await FilesCollection.getFile({ _id: mongodb.ObjectId(id) });
    if (!file || file.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (file[0].userId.toString() !== userId && !file[0].isPublic) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (file[0].type === 'folder') {
      return res.status(404).json({ error: "A folder doesn't have content" });
    }
    if (!fs.existsSync(file[0].localPath)) {
      return res.status(404).json({ error: 'Not found' });
    }
    const fileType = mime.lookup(file[0].name.split('.').pop());
    res.setHeader('Content-Type', fileType);
    const filData = fs.readFileSync(file[0].localPath);
    return res.status(200).send(filData);
  }
}

export default FilesController;
module.exports = FilesController;
