const request = require("supertest");
var cheerio = require("cheerio");
const db = require("../models/index");
const app = require("../app");
let server, agent;
function gettoken(res) {
  var $ = cheerio.load(res.text);
  return $("[name=_csrf]").val();
}
describe("Todo Application test", function () {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(4000, () => {});
    agent = request.agent(server);
  });

  afterAll(async () => {
    try {
      await db.sequelize.close();
      await server.close();
    } catch (error) {
      console.log(error);
    }
  });

  test("Creates a todo", async () => {
    const res = await agent.get("/");
    const Ctoken = gettoken(res);
    const response = await agent.post("/todos").send({
      title: "Buy milk",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: Ctoken,
    });
    expect(response.statusCode).toBe(302);
  });

  test("Marking as incomplete", async () => {
    let res = await agent.get("/");
    let Ctoken = gettoken(res);
    await agent.post("/todos").send({
      title: "Buy milk",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: Ctoken,
    });
    const groupedTodosResponse = await agent
      .get("/")
      .set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(groupedTodosResponse.text);
    const dueTodayCount = parsedGroupedResponse.duetodaytodos.length;
    const latestTodo = parsedGroupedResponse.duetodaytodos[dueTodayCount - 1];
    res = await agent.get("/");
    Ctoken = gettoken(res);

    const markCompleteResponse = await agent
      .put(`/todos/${latestTodo.id}`)
      .send({
        _csrf: Ctoken,
        completed: true,
      });
    const parsedUpdateResponse = JSON.parse(markCompleteResponse.text);
    expect(parsedUpdateResponse.completed).toBe(true);
  });
  test("Marking as Incomplete", async () => {
    let res = await agent.get("/");
    let Ctoken = gettoken(res);
    await agent.post("/todos").send({
      title: "Buy Shoes",
      dueDate: new Date().toISOString(),
      completed: true,
      _csrf: Ctoken,
    });

    const groupedTodosResponse = await agent
      .get("/")
      .set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(groupedTodosResponse.text);
    const dueTodayCount = parsedGroupedResponse.duetodaytodos.length;
    const latestTodo = parsedGroupedResponse.duetodaytodos[dueTodayCount - 1];

    res = await agent.get("/");
    Ctoken = gettoken(res);

    const markCompleteResponse = await agent
      .put(`/todos/${latestTodo.id}`)
      .send({
        _csrf: Ctoken,
        completed: false,
      });
    const parsedUpdateResponse = JSON.parse(markCompleteResponse.text);
    expect(parsedUpdateResponse.completed).toBe(false);
  });
  test("Deletes a todo", async () => {
    let res = await agent.get("/");
    let Ctoken = gettoken(res);
    await agent.post("/todos").send({
      title: "Buy groceries",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: Ctoken,
    });
    const groupedTodosResponse = await agent
      .get("/")
      .set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(groupedTodosResponse.text);
    const dueTodayCount = parsedGroupedResponse.duetodaytodos.length;
    const latestTodo = parsedGroupedResponse.duetodaytodos[dueTodayCount - 1];
    res = await agent.get("/");
    Ctoken = gettoken(res);
    const todoid = latestTodo.id;
    const deleteResponseTrue = await agent.delete(`/todos/${todoid}`).send({
      _csrf: Ctoken,
    });
    const parsedDeleteResponseTrue = JSON.parse(
      deleteResponseTrue.text
    ).success;
    expect(parsedDeleteResponseTrue).toBe(true);
    res = await agent.get("/");
    Ctoken = gettoken(res);

    const deleteResponseFail = await agent.delete(`/todos/${todoid}`).send({
      _csrf: Ctoken,
    });
    const parsedDeleteResponseFail = JSON.parse(
      deleteResponseFail.text
    ).success;
    expect(parsedDeleteResponseFail).toBe(false);
  });
});