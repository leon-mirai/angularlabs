// models/user.model.ts
export class User {
  constructor(
    public _id: string,   // MongoDB ObjectId
    public username: string,
    public email: string,
    public roles: string[] = [],
    public groups: string[] = [],
    public password?: string,
    public valid?: boolean,
    public profilePic?: string // Add profilePic field
  ) {}
}
