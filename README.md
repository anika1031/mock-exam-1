# mock-exam-1
# AWS Cloud Practitioner Mock Quiz — Setup Guide

A self-contained quiz app with a 40-minute timer, multi-select questions, per-question answer checking, and automatic result submission to AWS DynamoDB. Student name is collected at the start and saved alongside the score.

---

## How It Works

```
Student enters name → takes quiz → clicks Submit
        │
        │  POST /submit-quiz  (JSON with name, score, answers)
        ▼
API Gateway (HTTP API)
        │
        ▼
Lambda Function (Node.js 20.x)
        │
        ▼
DynamoDB Table: QuizResults
  partition key → student_name
  sort key      → submitted_at
```

---

## Files in This Project

```
aws-quiz-app/
├── index.html        ← complete quiz app (no build step needed)
├── lambda-index.js   ← paste this into your Lambda function
└── README.md         ← this file
```

---

## Prerequisites

- An AWS account with access to DynamoDB, Lambda, API Gateway, and Amplify
- A browser — no Node.js or npm needed locally

---

## Step 1 — Create the DynamoDB Table

This is where every quiz submission will be stored.

1. Go to **AWS Console → DynamoDB → Create table**
2. Fill in the following:
   - **Table name:** `QuizResults`
   - **Partition key:** `student_name` — type: **String**
   - **Sort key:** `submitted_at` — type: **String**
3. Under **Table settings**, leave **Default settings** selected (uses On-Demand billing — no capacity planning needed)
4. Click **Create table**
5. Wait for the status to show **Active** (takes about 30 seconds)

> Each row in this table represents one quiz submission. The student's name appears as the first column, making it easy to find a specific student's result.

---

## Step 2 — Create the Lambda Function

This function receives the quiz result and writes it to DynamoDB.

### 2a. Create the function

1. Go to **AWS Console → Lambda → Create function**
2. Select **Author from scratch**
3. Fill in:
   - **Function name:** `SaveQuizResult`
   - **Runtime:** `Node.js 20.x`
   - **Architecture:** `x86_64`
4. Click **Create function**

### 2b. Paste the code

1. In the function page, scroll down to the **Code source** section
2. Click on the existing file (`index.mjs`) in the file tree and delete all the code inside it
3. Rename the file to `index.js` by right-clicking it — or create a new file called `index.js`
4. Open the `lambda-index.js` file from this project and paste its entire contents in
5. At the top of the file, confirm the region matches where you created your DynamoDB table:
   ```javascript
   const client = new DynamoDBClient({ region: "ap-south-1" });
   ```
   Change `ap-south-1` to your own region if different (e.g. `us-east-1`)
6. Click **Deploy**

### 2c. Set the handler

1. Go to **Configuration → General configuration → Edit**
2. Set **Handler** to `index.handler`
3. Click **Save**

### 2d. Give Lambda permission to write to DynamoDB

1. In the Lambda function page, go to **Configuration → Permissions**
2. Under **Execution role**, click the **Role name** link — this opens IAM in a new tab
3. Click **Add permissions → Attach policies**
4. Search for `AmazonDynamoDBFullAccess`
5. Check the box next to it and click **Add permissions**
6. Close the IAM tab and return to Lambda

---

## Step 3 — Create the API Gateway

This creates the public HTTPS URL that the quiz app posts results to.

### 3a. Create the API

1. Go to **AWS Console → API Gateway → Create API**
2. Under **HTTP API**, click **Build**
3. Under **Integrations**, click **Add integration**:
   - Integration type: **Lambda**
   - Select your function: `SaveQuizResult`
4. Give your API a name: `quiz-results-api`
5. Click **Next**

### 3b. Configure the route

1. On the **Configure routes** screen:
   - **Method:** `POST`
   - **Resource path:** `/submit-quiz`
   - **Integration target:** `SaveQuizResult`
2. Click **Next**

### 3c. Set the stage

1. On the **Define stages** screen, you will see a `$default` stage with **Auto-deploy** turned on
2. Leave it exactly as-is — auto-deploy means every change goes live without a manual deploy step
3. Click **Next**, then **Create**

### 3d. Configure CORS

1. In your newly created API, click **CORS** in the left sidebar
2. Fill in:
   - **Access-Control-Allow-Origin:** `*`
   - **Access-Control-Allow-Headers:** `Content-Type`
   - **Access-Control-Allow-Methods:** `POST, OPTIONS`
3. Click **Save**

### 3e. Copy your Invoke URL

1. Click **Dashboard** in the left sidebar
2. Copy the **Invoke URL** — it looks like:
   ```
   https://xxxxxxxxxx.execute-api.ap-south-1.amazonaws.com
   ```
3. Your full submission endpoint is this URL with `/submit-quiz` added:
   ```
   https://xxxxxxxxxx.execute-api.ap-south-1.amazonaws.com/submit-quiz
   ```
   Keep this — you need it in the next step.

---

## Step 4 — Connect the Quiz App to Your API

1. Open `index.html` in any text editor
2. Near the top of the `<script>` block, find this line:
   ```javascript
   const QUIZ_API_ENDPOINT = "https://awih5d38hc.execute-api.ap-south-1.amazonaws.com/submit-quiz";
   ```
3. Replace the URL with your own Invoke URL from Step 3e:
   ```javascript
   const QUIZ_API_ENDPOINT = "https://YOUR-API-ID.execute-api.YOUR-REGION.amazonaws.com/submit-quiz";
   ```
4. Save the file

---

## Step 5 — Deploy to AWS Amplify

### Option A — Drag and Drop (quickest)

1. Go to **AWS Console → AWS Amplify**
2. Click **Create new app**
3. Choose **Deploy without Git provider** → click **Next**
4. Give your app a name (e.g. `aws-quiz-app`)
5. Drag and drop the entire `aws-quiz-app/` folder onto the upload area (or zip it first)
6. Click **Save and deploy**
7. Wait about 1–2 minutes — Amplify will give you a live public URL like:
   ```
   https://main.xxxxxxxxxx.amplifyapp.com
   ```

### Option B — GitHub (recommended for ongoing updates)

1. Push your project folder to a GitHub repository
2. Go to **AWS Amplify → Create new app → GitHub**
3. Authorize Amplify to access your GitHub account
4. Select your repository and branch (e.g. `main`)
5. On the **Build settings** screen, replace the default build config with:
   ```yaml
   version: 1
   frontend:
     phases:
       build:
         commands: []
     artifacts:
       baseDirectory: /
       files:
         - "**/*"
     cache:
       paths: []
   ```
6. Click **Save and deploy**
7. Any future `git push` to that branch will automatically redeploy the app

---

## Step 6 — Test the Full Flow

1. Open your Amplify URL in a browser
2. Enter a student name and click **Begin Exam**
3. Answer some questions and click **Submit Exam**
4. On the result screen you should see:
   ```
   ✅ Result for "Student Name" saved to DynamoDB successfully.
   ```
5. Go to **DynamoDB → Tables → QuizResults → Explore table items**
6. You should see a new row with the student's name, score, percentage, and timestamp

---

## Viewing Results in DynamoDB

### Browse in the console

1. Go to **DynamoDB → Tables → QuizResults**
2. Click **Explore table items**
3. Each row contains the following columns:

| Column | Description |
|---|---|
| `student_name` | Name entered at quiz start |
| `submitted_at` | ISO timestamp of submission |
| `score` | Raw marks obtained |
| `total_marks` | Always 40 |
| `percentage` | Score as a percentage |
| `correct_count` | Number of fully correct questions |
| `wrong_count` | Number of wrong answers |
| `unanswered_count` | Questions left unanswered |
| `time_taken` | Time used in MM:SS format |
| `answers` | Full JSON of every question, chosen answer, and correct answer |

### Export to CSV

In **Explore items**, click **Download CSV** at the top right of the results table.

### Query via AWS CLI

```bash
# Get all results
aws dynamodb scan \
  --table-name QuizResults \
  --region ap-south-1

# Get all attempts by a specific student
aws dynamodb query \
  --table-name QuizResults \
  --key-condition-expression "student_name = :name" \
  --expression-attribute-values '{":name": {"S": "Rahul Sharma"}}' \
  --region ap-south-1
```

---

## Debugging

If results are not saving, check the following in order.

### 1. Check the browser console

Open **DevTools (F12) → Console tab** and look for a red error when you click Submit:

| Error message | Cause | Fix |
|---|---|---|
| `CORS error` | CORS not configured on API Gateway | Redo Step 3d |
| `Failed to fetch` | Wrong API URL or API not deployed | Check the URL in Step 4 |
| `API returned 500` | Lambda is crashing | Check CloudWatch logs (below) |
| `API returned 403` | Lambda has no permission to write | Redo Step 2d |

### 2. Check Lambda logs in CloudWatch

1. Go to **CloudWatch → Log groups**
2. Find and click `/aws/lambda/SaveQuizResult`
3. Click the latest log stream
4. Look for lines starting with `ERROR` — these will tell you exactly what went wrong

### 3. Test Lambda directly

1. In the Lambda function page, click the **Test** tab
2. Create a new test event and paste this as the body:
   ```json
   {
     "body": "{\"student_name\":\"Test Student\",\"submitted_at\":\"2025-01-01T00:00:00Z\",\"score\":30,\"total_marks\":40,\"percentage\":75,\"correct_count\":25,\"wrong_count\":5,\"unanswered_count\":0,\"time_taken\":\"22:30\",\"answers\":[]}"
   }
   ```
3. Click **Test**
4. If the response shows `"message": "Result saved successfully"` then Lambda and DynamoDB are working correctly — the issue is with API Gateway or CORS configuration

---

## Security Notes for Production

- Replace `Access-Control-Allow-Origin: *` in `lambda-index.js` with your exact Amplify domain (e.g. `https://main.xxxxxxxx.amplifyapp.com`) to prevent other sites from submitting fake results
- Use a scoped IAM policy instead of `AmazonDynamoDBFullAccess` — Lambda only needs `dynamodb:PutItem` on the `QuizResults` table
- Consider adding an **API Gateway API key** to rate-limit or block unauthorized submissions

---

## Architecture Summary

| Service | Purpose | Cost |
|---|---|---|
| AWS Amplify | Hosts and serves `index.html` globally via CDN | Free tier: 1000 build minutes/month |
| API Gateway | Provides the public HTTPS endpoint | Free tier: 1M requests/month |
| Lambda | Runs the code that writes to DynamoDB | Free tier: 1M invocations/month |
| DynamoDB | Stores every quiz result permanently | Free tier: 25GB storage |
| CloudWatch | Automatically captures Lambda logs | Free tier: 5GB logs/month |

For typical classroom use, this entire setup runs within the AWS free tier.
API gateway

<img width="1900" height="724" alt="image" src="https://github.com/user-attachments/assets/bdd37ffc-6b1a-4455-a2e2-b476b5bb4fa1" />
<img width="1888" height="832" alt="image" src="https://github.com/user-attachments/assets/08d7bd70-4812-47b1-9013-db29238fa564" />
<img width="1909" height="742" alt="image" src="https://github.com/user-attachments/assets/1b46a693-f0d4-49df-894d-f108046498eb" />
<img width="1911" height="824" alt="image" src="https://github.com/user-attachments/assets/15617292-4338-4cf0-8afe-4531ba599a48" />
<img width="1918" height="947" alt="image" src="https://github.com/user-attachments/assets/bdf259f8-fbca-448c-9a77-59ceb14921ed" />
