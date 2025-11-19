import { createHashHistory } from "history";
import { History } from "history";

// TODO: Add user confirmation setting
// Use history v4 compatible API for React Router v4
// Type assertion to handle version compatibility between history v4 and v5 types
const history = createHashHistory() as any as History;
export default history;
