const express = require("express");
const bcrypt = require("bcrypt");
var jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());
const path = require("path");
const dbPath = path.join(__dirname, "covid19IndiaPortal.db");
let dbObject = null;
const { open } = require("sqlite");
const DB = require("sqlite3");

const createDbConnectionStartServer = async () => {
  try {
    dbObject = await open({
      filename: dbPath,
      driver: DB.Database,
    });
    app.listen(3000, () => {
      console.log(`server started at port 30000`);
    });
  } catch (error) {
    console.log(`DB error :${error}`);
  }
};
createDbConnectionStartServer();

///login/api call
app.post("/login/", async (request, response) => {
  const requestBody = request.body;
  const { username, password } = request.body;
  //console.log(request.body);
  if (requestBody === undefined) {
    response.status(400);
    response.send(`Invalid user`);
  } else {
    let validUser = `select * from user WHERE username = '${username}';`;
    const ValidUserDbResponse = await dbObject.get(validUser);
    // console.log(ValidUserDbResponse);
    if (ValidUserDbResponse === undefined) {
      response.status(400);
      response.send(`Invalid user`);
    } else {
      let HashedPassword = `select password from user WHERE username = '${username}';`;
      const HashedPasswordResponse = await dbObject.get(HashedPassword);
      const isValidPassword = await bcrypt.compare(
        password,
        HashedPasswordResponse.password
      );
      if (isValidPassword) {
        let JwtToken = jwt.sign(requestBody, "Vikaskondeti");
        response.send({
          jwtToken: JwtToken,
        });
      } else {
        response.status(400);
        response.send(`Invalid password`);
      }
    }
  }
});

//MiddlewareFunction

const tokenAuthentication = (request, response, next) => {
  let JWTToken;
  const authHeader = request.headers["authorization"];
  //console.log(authHeader);
  if (authHeader !== undefined) {
    JWTToken = authHeader.split(" ")[1];
    //console.log(JWTToken);
    if (JWTToken !== undefined) {
      const ValidJWTToken = jwt.verify(
        JWTToken,
        "Vikaskondeti",
        async (error, payload) => {
          if (error) {
            response.status(401);
            response.send(`Invalid JWT Token`);
          } else {
            request.username = payload.username;
            next();
          }
        }
      );
    } else {
      response.status(401);
      response.send(`Invalid JWT Token`);
    }
  } else {
    response.status(401);
    response.send(`Invalid JWT Token`);
  }
};
//Get request to get list of all states

app.get("/states/", tokenAuthentication, async (request, response) => {
  const GetStateQuery = `select state_id as stateId, state_name as stateName,population as population from state;`;
  const GetStateQueryResponse = await dbObject.all(GetStateQuery);
  //console.log(request.username);
  response.send(GetStateQueryResponse);
});

//get Get request to get specific  state details

app.get("/states/:stateId/", tokenAuthentication, async (request, response) => {
  const { stateId } = request.params;
  const GetStateQuery = `select state_id as stateId, state_name as stateName,population as population from state WHERE state_id=${stateId};`;
  const GetStateQueryResponse = await dbObject.get(GetStateQuery);
  //console.log(request.username);
  response.send(GetStateQueryResponse);
});

//post Request adding distict into database

app.post("/districts/", tokenAuthentication, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const postAddingDistrict = `INSERT  INTO district(district_name,state_id,cases,cured,active,deaths)
    VALUES("${districtName}",${stateId},${cases},${cured},${active},${deaths});`;
  const postAddingDistrictResponse = await dbObject.run(postAddingDistrict);
  //console.log(request.username);
  response.send("District Successfully Added");
});

//get request to get the district for specific district

app.get(
  "/districts/:districtId/",
  tokenAuthentication,
  async (request, response) => {
    const { districtId } = request.params;
    const GetDistrictIdQuery = `SELECT district_id as districtId,district_name as districtName,state_id as stateId,cases as cases,cured as cured,active as active,deaths as deaths from district WHERE district_id=${districtId};`;
    const GetDistrictIdQueryResponse = await dbObject.get(GetDistrictIdQuery);
    //console.log(request.username);
    response.send(GetDistrictIdQueryResponse);
  }
);

//Delete request to get list of all states

app.delete(
  "/districts/:districtId/",
  tokenAuthentication,
  async (request, response) => {
    const { districtId } = request.params;
    const DeleteDistrictQuery = `DELETE from district where district_id=${districtId};`;
    const DeleteDistrictQueryResponse = await dbObject.run(DeleteDistrictQuery);
    //console.log(request.username);
    response.send(`District Removed`);
  }
);

//PUT Request updating distict into database

app.put(
  "/districts/:districtId/",
  tokenAuthentication,
  async (request, response) => {
    const { districtId } = request.params;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;
    const postAddingDistrict = `UPDATE district SET district_name = "${districtName}" ,state_id=${stateId},cases=${cases},cured=${cured},active=${active},deaths=${deaths} WHERE district_id=${districtId};`;
    const postAddingDistrictResponse = await dbObject.run(postAddingDistrict);
    //console.log(request.username);
    response.send("District Details Updated");
  }
);

//Returns the statistics of total cases, cured, active, deaths of a specific state based on state ID

app.get(
  "/states/:stateId/stats/",
  tokenAuthentication,
  async (request, response) => {
    const { stateId } = request.params;
    const GetStateStatsQuery = `select sum(cases) as totalCases, sum(cured) as totalCured , sum(active) as totalActive,sum(deaths) as totalDeaths from district WHERE state_id =${stateId};`;
    const GetStateStatsQueryResponse = await dbObject.get(GetStateStatsQuery);
    //console.log(request.username);
    response.send(GetStateStatsQueryResponse);
  }
);

module.exports = app;
