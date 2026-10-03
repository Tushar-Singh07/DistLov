import { IUserDocument } from '../models/UserModel.js';
import { ISessionDocument } from '../models/SessionModel.js';

declare global {
  namespace Express {
    interface Request {
      user?: IUserDocument;
      sessionDoc?: ISessionDocument;
    }
  }
}
