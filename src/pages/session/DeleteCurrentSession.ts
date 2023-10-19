

import { ISession } from "../../model/session";
import { SessionService } from "../../services/sessions";


export const deleteCurrentSession = async (id: any) => {
    // Create an instance of the SessionService class
    const sessionService = new SessionService();
  
    // Get the session with the specified id
    const session:  ISession | null = await sessionService.getSession(id);
  
    // If the session exists, remove it
    if (session) {
      await sessionService.removeSession(id);
    }
  };