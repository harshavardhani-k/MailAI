package com.mailai.backend;

import com.openai.client.OpenAIClient;
import com.openai.client.okhttp.OpenAIOkHttpClient;
import com.openai.models.responses.Response;
import com.openai.models.responses.ResponseCreateParams;

import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AIController {

    private final OpenAIClient client;

    public AIController() {
        this.client = OpenAIOkHttpClient.fromEnv();
    }

    @PostMapping("/command")
    public Map<String, Object> processCommand(
            @RequestBody Map<String, String> request) {

        String command = request.get("command");

        if (command == null || command.isBlank()) {
            return Map.of(
                    "success", false,
                    "message", "Please enter a command."
            );
        }

        String prompt = """
        You are the AI assistant for a Gmail web application called MailAI.

        Convert the user's natural language command into ONE UI action.

        Allowed actions:

        OPEN_INBOX
        OPEN_SENT
        OPEN_DRAFTS
        SHOW_UNREAD
        SHOW_THIS_WEEK
        SHOW_ALL
        SEARCH_EMAILS
        OPEN_LATEST_EMAIL
        COMPOSE_EMAIL
        REPLY_TO_CURRENT
        UNKNOWN

        For COMPOSE_EMAIL, extract:
        - to: recipient email address
        - subject: email subject
        - body: email body

        Return ONLY valid JSON.
        Do not use markdown.
        Do not put the JSON inside ```.

        JSON format:

        {
          "action": "ACTION_NAME",
          "to": "",
          "subject": "",
          "body": "",
          "searchTerm": "",
          "sender": "",
          "message": ""
        }

        Examples:

        User:
        Send an email to john@example.com with subject "Meeting Tomorrow"
        and body "Let's meet at 3pm"

        Response:
        {
          "action": "COMPOSE_EMAIL",
          "to": "john@example.com",
          "subject": "Meeting Tomorrow",
          "body": "Let's meet at 3pm",
          "searchTerm": "",
          "sender": "",
          "message": "Opening the compose window."
        }

        User:
        Compose an email to test@gmail.com saying hello

        Response:
        {
          "action": "COMPOSE_EMAIL",
          "to": "test@gmail.com",
          "subject": "",
          "body": "hello",
          "searchTerm": "",
          "sender": "",
          "message": "Opening the compose window."
        }

        User:
        show unread emails

        Response:
        {
          "action": "SHOW_UNREAD",
          "to": "",
          "subject": "",
          "body": "",
          "searchTerm": "",
          "sender": "",
          "message": "Showing your unread emails."
        }

        User command:
        %s
        """.formatted(command);

        ResponseCreateParams params =
                ResponseCreateParams.builder()
                        .model("gpt-5.6-luna")
                        .input(prompt)
                        .build();

        Response response = client.responses().create(params);

       String result = response.output().stream()
        .flatMap(item -> item.message().stream())
        .flatMap(message -> message.content().stream())
        .flatMap(content -> content.outputText().stream())
        .map(outputText -> outputText.text())
        .findFirst()
        .orElse("");

        return Map.of(
                "success", true,
                "result", result
        );
    }
}