package com.mailai.backend;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class GmailController {

    private final OAuth2AuthorizedClientService authorizedClientService;

    public GmailController(OAuth2AuthorizedClientService authorizedClientService) {
        this.authorizedClientService = authorizedClientService;
    }

    @GetMapping("/emails")
    public List<Map<String, Object>> getEmails(Authentication authentication) {

        OAuth2AuthorizedClient client =
                authorizedClientService.loadAuthorizedClient(
                        "google",
                        authentication.getName()
                );

        if (client == null) {
            throw new RuntimeException("Google account is not authenticated");
        }

        String accessToken = client.getAccessToken().getTokenValue();

        RestClient restClient = RestClient.builder()
                .baseUrl("https://gmail.googleapis.com/gmail/v1/users/me")
                .defaultHeader(
                        HttpHeaders.AUTHORIZATION,
                        "Bearer " + accessToken
                )
                .defaultHeader(
                        HttpHeaders.ACCEPT,
                        MediaType.APPLICATION_JSON_VALUE
                )
                .build();

        Map<String, Object> response = restClient
                .get()
                .uri("/messages?maxResults=10")
                .retrieve()
                .body(Map.class);

        if (response == null || !response.containsKey("messages")) {
            return new ArrayList<>();
        }

        List<Map<String, Object>> messages =
                (List<Map<String, Object>>) response.get("messages");

        List<Map<String, Object>> emails = new ArrayList<>();

        for (Map<String, Object> message : messages) {

            String messageId = (String) message.get("id");

            Map<String, Object> details = restClient
                    .get()
                    .uri("/messages/" + messageId + "?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date")
                    .retrieve()
                    .body(Map.class);

            if (details != null) {
                emails.add(details);
            }
        }

        return emails;
    }
    @PostMapping("/emails/send")
public Map<String, Object> sendEmail(
        Authentication authentication,
        @RequestBody Map<String, String> request) {

    OAuth2AuthorizedClient client =
            authorizedClientService.loadAuthorizedClient(
                    "google",
                    authentication.getName()
            );

    if (client == null) {
        throw new RuntimeException(
                "Google account is not authenticated"
        );
    }

    String accessToken =
            client.getAccessToken().getTokenValue();

    String to = request.get("to");
    String subject = request.get("subject");
    String body = request.get("body");

    if (to == null || to.isBlank()) {
        return Map.of(
                "success", false,
                "message", "Recipient is required."
        );
    }

    if (subject == null) {
        subject = "";
    }

    if (body == null) {
        body = "";
    }

    String rawEmail =
            "To: " + to + "\r\n" +
            "Subject: " + subject + "\r\n" +
            "Content-Type: text/plain; charset=UTF-8\r\n" +
            "\r\n" +
            body;

    String encodedEmail =
            Base64.getUrlEncoder()
                    .withoutPadding()
                    .encodeToString(
                            rawEmail.getBytes(
                                    StandardCharsets.UTF_8
                            )
                    );

    Map<String, Object> emailRequest =
            Map.of("raw", encodedEmail);

    RestClient restClient =
            RestClient.builder()
                    .baseUrl(
                            "https://gmail.googleapis.com/gmail/v1/users/me"
                    )
                    .defaultHeader(
                            HttpHeaders.AUTHORIZATION,
                            "Bearer " + accessToken
                    )
                    .defaultHeader(
                            HttpHeaders.CONTENT_TYPE,
                            MediaType.APPLICATION_JSON_VALUE
                    )
                    .build();

    Map<String, Object> response =
            restClient.post()
                    .uri("/messages/send")
                    .body(emailRequest)
                    .retrieve()
                    .body(Map.class);

    return Map.of(
            "success", true,
            "message", "Email sent successfully.",
            "gmailResponse", response
    );
}
@GetMapping("/emails/search")
public List<Map<String, Object>> searchEmails(
        Authentication authentication,
        @RequestParam String query) {

    OAuth2AuthorizedClient client =
            authorizedClientService.loadAuthorizedClient(
                    "google",
                    authentication.getName()
            );

    if (client == null) {
        throw new RuntimeException(
                "Google account is not authenticated"
        );
    }

    String accessToken =
            client.getAccessToken().getTokenValue();

    RestClient restClient =
            RestClient.builder()
                    .baseUrl(
                            "https://gmail.googleapis.com/gmail/v1/users/me"
                    )
                    .defaultHeader(
                            HttpHeaders.AUTHORIZATION,
                            "Bearer " + accessToken
                    )
                    .defaultHeader(
                            HttpHeaders.ACCEPT,
                            MediaType.APPLICATION_JSON_VALUE
                    )
                    .build();

    Map<String, Object> response =
            restClient.get()
                    .uri(uriBuilder ->
                            uriBuilder
                                    .path("/messages")
                                    .queryParam("q", query)
                                    .queryParam("maxResults", 50)
                                    .build()
                    )
                    .retrieve()
                    .body(Map.class);

    if (response == null ||
            !response.containsKey("messages")) {

        return new ArrayList<>();
    }

    List<Map<String, Object>> messages =
            (List<Map<String, Object>>)
                    response.get("messages");

    List<Map<String, Object>> emails =
            new ArrayList<>();

    for (Map<String, Object> message : messages) {

        String messageId =
                (String) message.get("id");

        Map<String, Object> details =
                restClient.get()
                        .uri(
                                "/messages/" +
                                messageId +
                                "?format=metadata" +
                                "&metadataHeaders=Subject" +
                                "&metadataHeaders=From" +
                                "&metadataHeaders=Date"
                        )
                        .retrieve()
                        .body(Map.class);

        if (details != null) {
            emails.add(details);
        }
    }

    return emails;
}
@GetMapping("/emails/{id}")
public Map<String, Object> getEmailById(
        Authentication authentication,
        @PathVariable String id) {

    OAuth2AuthorizedClient client =
            authorizedClientService.loadAuthorizedClient(
                    "google",
                    authentication.getName()
            );

    if (client == null) {
        throw new RuntimeException(
                "Google account is not authenticated"
        );
    }

    String accessToken =
            client.getAccessToken().getTokenValue();

    RestClient restClient =
            RestClient.builder()
                    .baseUrl(
                            "https://gmail.googleapis.com/gmail/v1/users/me"
                    )
                    .defaultHeader(
                            HttpHeaders.AUTHORIZATION,
                            "Bearer " + accessToken
                    )
                    .defaultHeader(
                            HttpHeaders.ACCEPT,
                            MediaType.APPLICATION_JSON_VALUE
                    )
                    .build();

    Map<String, Object> email =
            restClient.get()
                    .uri("/messages/" + id + "?format=full")
                    .retrieve()
                    .body(Map.class);

    if (email == null) {
        throw new RuntimeException(
                "Email not found"
        );
    }

    return email;
}
@GetMapping("/emails/search")
public List<Map<String, Object>> searchEmails(
        Authentication authentication,
        @RequestParam String query) {

    OAuth2AuthorizedClient client =
            authorizedClientService.loadAuthorizedClient(
                    "google",
                    authentication.getName()
            );

    if (client == null) {
        throw new RuntimeException(
                "Google account is not authenticated"
        );
    }

    String accessToken =
            client.getAccessToken().getTokenValue();

    RestClient restClient =
            RestClient.builder()
                    .baseUrl(
                            "https://gmail.googleapis.com/gmail/v1/users/me"
                    )
                    .defaultHeader(
                            HttpHeaders.AUTHORIZATION,
                            "Bearer " + accessToken
                    )
                    .defaultHeader(
                            HttpHeaders.ACCEPT,
                            MediaType.APPLICATION_JSON_VALUE
                    )
                    .build();

    String encodedQuery =
            java.net.URLEncoder.encode(
                    query,
                    StandardCharsets.UTF_8
            );

    Map<String, Object> response =
            restClient.get()
                    .uri(
                            "/messages?maxResults=10&q="
                                    + encodedQuery
                    )
                    .retrieve()
                    .body(Map.class);

    if (response == null ||
            !response.containsKey("messages")) {
        return new ArrayList<>();
    }

    List<Map<String, Object>> messages =
            (List<Map<String, Object>>)
                    response.get("messages");

    List<Map<String, Object>> emails =
            new ArrayList<>();

    for (Map<String, Object> message : messages) {

        String messageId =
                (String) message.get("id");

        Map<String, Object> details =
                restClient.get()
                        .uri(
                                "/messages/"
                                        + messageId
                                        + "?format=metadata"
                                        + "&metadataHeaders=Subject"
                                        + "&metadataHeaders=From"
                                        + "&metadataHeaders=Date"
                        )
                        .retrieve()
                        .body(Map.class);

        if (details != null) {
            emails.add(details);
        }
    }

    return emails;
}
}