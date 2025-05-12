import * as signalR from "@aspnet/signalr";
import { IEstimate } from "../../model/estimate";
import { IUserInfo } from "../../model/user";
import { IdentityServiceId, IIdentityService } from "../identity";
import { Services } from "../services";
import { defineIncomingOperation, defineOperation, IChannel } from "./channels";
import { ISnapshot } from "../../model/snapshots";

const baseUrl = "https://msdevlabs-estimate-backend.azurewebsites.net/";

enum Action {
    Join = "join",
    Left = "left",
    Estimate = "estimate",
    EstimateUpdated = "estimate-updated",
    Reveal = "reveal",
    Add = "add",
    Switch = "switch",
    Snapshot = "snapshot"
}

export class SignalRChannel implements IChannel {

    onStatus?: (status: string) => void;

    estimate = defineOperation<IEstimate>(async estimate => {
        await this.sendToOtherClients(Action.Estimate, estimate);
    });

    estimateUpdated = defineOperation<{
        workItemId: number;
        value: number | string | undefined;
    }>(async payload => {
        await this.sendToOtherClients(Action.EstimateUpdated, payload);
    });

    setWorkItem = defineOperation<number>(async workItemId => {
        await this.sendToOtherClients(Action.Switch, workItemId);
    });

    revealed = defineOperation<void>(async () => {
        await this.sendToOtherClients(Action.Reveal, null);
    });

    join = defineOperation<IUserInfo>(async userInfo => {
        if (this.connection) {
            await this.connection.send(Action.Join, this.sessionId, userInfo);
        }
    });

    left = defineIncomingOperation<string>();

    snapshot = defineOperation<ISnapshot>(async snapshot => {
        await this.sendToOtherClients(Action.Snapshot, snapshot);
    });

    private connection: signalR.HubConnection | undefined;
    private sessionId: string = "";

    async start(sessionId: string): Promise<void> {
        this.sessionId = sessionId;

        const identityService = Services.getService<IIdentityService>(
            IdentityServiceId
        );
        const identity = identityService.getCurrentIdentity();

        this.connection = new signalR.HubConnectionBuilder()
            .withUrl(
                `${baseUrl}/estimate?sessionId=${this.sessionId}&tfId=${
                    identity.id
                }`
            )
            .configureLogging(signalR.LogLevel.Information)
            .build();
      
        // Hook up handler for all messages the server sends
        this.connection.on("broadcast", this.onReceive);

        const maxRetries = 5;
        const retryDelay = 5000; // milliseconds

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                await this.connection.start();
                

                await this.join({
                    tfId: identity.id,
                    name: identity.displayName,
                    imageUrl: identity.imageUrl
                });

                return; // Exit the loop if connection is successful
            }
            catch (error) {
                if (attempt < maxRetries) {
                    if (this.onStatus) {
                        this.onStatus(`Connection attempt failed. Retrying ${attempt + 1}/${maxRetries} in ${retryDelay / 1000} seconds...`);
                    }
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                } 
                else {
                    const failMsg = `Max amount of retries reached. Could not establish connection.<br><br>
                                    If the issue persists, please <a href="https://github.com/microsoft/azure-boards-estimate/issues" target="_blank">report the issue on GitHub</a> or create an offline session.<br><br>
                                    If the endpoint <a href="https://msdevlabs-estimate-backend.azurewebsites.net" target="_blank">https://msdevlabs-estimate-backend.azurewebsites.net/</a> is not reachable from a browser, it might be blocked by a firewall or network policy.`;
                    if (this.onStatus) this.onStatus(failMsg);
                    throw error; // Rethrow the error after max attempts
                }
                
            }
        }


        // // Start connection
        // await this.connection.start().catch(err => {
        
        //     // tslint:disable-next-line:no-console
        //     console.error(err.toString());
        // });

        // // Say hello to other clients
        // await this.join({
        //     tfId: identity.id,
        //     name: identity.displayName,
        //     imageUrl: identity.imageUrl
        // });
      
        // // Wait for snapshot
    }

    async end(): Promise<void> {
        if (this.connection) {
            await this.connection.stop();
        }
    }

    async sendToOtherClients<TPayload>(action: Action, payload: TPayload) {
        if (this.connection) {
            this.connection.send("broadcast", this.sessionId, action, payload);
        }
    }

    private onReceive = (action: Action, payload: any) => {
        
        switch (action) {
            case Action.Estimate: {
                // Received estimate from another player
                this.estimate.incoming(payload);
                break;
            }

            case Action.EstimateUpdated: {
                this.estimateUpdated.incoming(payload);
                break;
            }

            case Action.Join: {
                // Another user has joined
                this.join.incoming(payload);
                break;
            }

            case Action.Switch: {
                this.setWorkItem.incoming(payload);
                break;
            }

            case Action.Left: {
                this.left.incoming(payload);
                break;
            }

            case Action.Reveal: {
                this.revealed.incoming(payload);
                break;
            }

            case Action.Snapshot: {
                this.snapshot.incoming(payload);
                break;
            }

            default: {
                console.error("Unknown action received: " + action);
            }
        }
    };
}
