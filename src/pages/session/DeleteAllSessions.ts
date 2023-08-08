

import { ISession } from "../../model/session";
import { SessionService } from "../../services/sessions";

export const deleteAllSessions = async ()=>{
     // Create an instance of the SessionService class
     const sessionService = new SessionService();

     // Get all sessions
     const sessions: ISession[] = await sessionService.getSessions();
 
     // Remove each session
     for (const session of sessions) {
         await sessionService.removeSession(session.id);
     }
 


}