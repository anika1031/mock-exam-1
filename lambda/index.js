const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const { marshall } = require("@aws-sdk/util-dynamodb");

const client = new DynamoDBClient({ region: "ap-south-1" });

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST,OPTIONS"
  };

  const method = event.requestContext?.http?.method || event.httpMethod;

  if (method === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    console.log("Incoming event:", JSON.stringify(event));

    const body = JSON.parse(event.body || "{}");

    console.log("Parsed body:", body);

    const item = {
      student_name: body.student_name || "Unknown",
      quiz_id: body.quiz_id || "aws_mock_1",
      submitted_at: body.submitted_at || new Date().toISOString(),
      score: body.score ?? 0,
      total_marks: body.total_marks ?? 0,
      percentage: body.percentage ?? 0,
      correct_count: body.correct_count ?? 0,
      wrong_count: body.wrong_count ?? 0,
      unanswered: body.unanswered_count ?? body.unanswered,
      time_taken: body.time_taken || "00:00",
      answers: JSON.stringify(body.answers || [])
    };

    await client.send(new PutItemCommand({
      TableName: "QuizResults",
      Item: marshall(item)
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "Saved successfully" })
    };

  } catch (err) {
    console.error("ERROR:", err);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
