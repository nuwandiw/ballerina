// Copyright (c) 2018 WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
//
// WSO2 Inc. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

import ballerina/http;
import ballerina/io;
import ballerina/util;
import ballerina/sql;

endpoint http:ServiceEndpoint participant2EP {
    port:8890
};

endpoint sql:Client testDB {
        username: "SA",
        password: "",
        options: {url:"jdbc:hsqldb:hsql://localhost:9001/TEST_SQL_CONNECTOR"}
};

State state = new();

@http:ServiceConfig {
    basePath:"/"
}
service<http:Service> participant2 bind participant2EP {

    getState(endpoint ep, http:Request req) {
        http:Response res = {};
        res.setStringPayload(state.toString());
        state.reset();
        _ = ep -> respond(res);
    }

    task1 (endpoint conn, http:Request req) {
        http:Response res = {};
        res.setStringPayload("Resource is invoked");
        var forwardRes = conn -> respond(res);  
        match forwardRes {
            http:HttpConnectorError err => {
                io:print("Participant2 could not send response to participant1. Error:");
                io:println(err);
            }
            null => io:print("");
        }
    }

    task2 (endpoint conn, http:Request req) {
        http:Response res = {};
        string result = "incorrect id";
        transaction {
            if (req.getHeader("X-XID") == req.getHeader("participant-id")) {
                result = "equal id";
            }
        }
        res.setStringPayload(result);
        var forwardRes = conn -> respond(res);  
        match forwardRes {
            http:HttpConnectorError err => {
                io:print("Participant2 could not send response to participant1. Error:");
                io:println(err);
            }
            null => io:print("");
        }
    }

    testSaveToDatabaseSuccessfulInParticipant(endpoint ep, http:Request req) {
        saveToDatabase(ep, req, false);
    }

    testSaveToDatabaseFailedInParticipant(endpoint ep, http:Request req) {
        saveToDatabase(ep, req, true);
    }

    @http:ResourceConfig {
        path: "/checkCustomerExists/{uuid}"
    }
    checkCustomerExists(endpoint ep, http:Request req, string uuid) {
        http:Response res = {statusCode: 200};
        sql:Parameter para1 = {sqlType:sql:Type.VARCHAR, value:uuid};
        sql:Parameter[] params = [para1];
        var x = testDB -> select("SELECT registrationID FROM Customers WHERE registrationID = ?", params, typeof Registration);
        match x {
            table dt => {
               string payload;
               while (dt.hasNext()) {
                   Registration reg =? <Registration>dt.getNext();
                   io:println(reg);
                   payload = reg.REGISTRATIONID;
               }
               res.setStringPayload(payload);
            }
            sql:SQLConnectorError err1 => {
               res.statusCode = 500;
            }
        }

        _ = ep -> respond(res);
    }
}

struct Registration {
    string REGISTRATIONID;
}

function saveToDatabase(http:ServiceEndpoint conn, http:Request req, boolean shouldAbort) {
    endpoint http:ServiceEndpoint ep = conn;
    http:Response res = {statusCode: 200};
    transaction with oncommit=onCommit, onabort=onAbort {
        transaction with oncommit=onLocalParticipantCommit, onabort=onLocalParticipantAbort {
        }
        string uuid = util:uuid();

        var result = testDB -> update("Insert into Customers (firstName,lastName,registrationID,creditLimit,country)
                                                 values ('John', 'Doe', '" + uuid +"', 5000.75, 'USA')", null);
        match result {
            int insertCount => io:println(insertCount);
            error => io:println("");
        }
        res.setStringPayload(uuid);
        var forwardRes = ep -> respond(res);
        match forwardRes {
            http:HttpConnectorError err => {
                io:print("Participant2 could not send response to participant1. Error:");
                io:println(err);
            }
            null => io:print("");
        }
        if(shouldAbort) {
            abort;
        }
    }
}

function onAbort() {
    state.abortedFunctionCalled = true;
}

function onCommit() {
    state.committedFunctionCalled = true;
}

function onLocalParticipantAbort() {
    state.localParticipantAbortedFunctionCalled = true;
}

function onLocalParticipantCommit() {
    state.localParticipantCommittedFunctionCalled = true;
}

type State object {
    private {
        boolean abortedFunctionCalled;
        boolean committedFunctionCalled;
        boolean localParticipantCommittedFunctionCalled;
        boolean localParticipantAbortedFunctionCalled;
    }

    function reset() {
        abortedFunctionCalled = false;
        committedFunctionCalled = false;
        localParticipantCommittedFunctionCalled = false;
        localParticipantAbortedFunctionCalled = false;
    }

    function toString() returns string {
        return io:sprintf("abortedFunctionCalled=%b,committedFunctionCalled=%s," +
                            "localParticipantCommittedFunctionCalled=%s,localParticipantAbortedFunctionCalled=%s",
                            [abortedFunctionCalled, committedFunctionCalled,
                                localParticipantCommittedFunctionCalled, localParticipantAbortedFunctionCalled]);
    }
}
