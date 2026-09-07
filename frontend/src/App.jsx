import { useState, useEffect } from "react";
import {
  Inbox,
  Send,
  FileText,
  Trash2,
  Plus,
  Search,
  Paperclip,
  X,
  Sparkles,
  ArrowLeft,
  Reply,
  MoreVertical,
  Mail,
  User,
  Bot,
} from "lucide-react";

import "./App.css";

function App() {
  // =========================
  // EMAIL STATE
  // =========================

  const [emails, setEmails] = useState([]);
  const [loadingEmails, setLoadingEmails] = useState(true);
  const [emailError, setEmailError] = useState("");

  const [activeFolder, setActiveFolder] = useState("inbox");
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");

  // =========================
  // COMPOSE STATE
  // =========================

  const [showCompose, setShowCompose] = useState(false);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  // =========================
  // AI STATE
  // =========================

  const [aiCommand, setAiCommand] = useState("");
  const [aiMessage, setAiMessage] = useState(
    "Hi! I can help you manage your emails."
  );

  // =========================
  // LOAD GMAIL EMAILS
  // =========================

  useEffect(() => {
    const loadEmails = async () => {
      try {
        const response = await fetch(
          "http://localhost:8080/api/emails",
          {
            credentials: "include",
          }
        );

        console.log("API status:", response.status);

        if (response.status === 401) {
          console.log("Google login required");
          setEmails([]);
          setLoadingEmails(false);
          return;
        }

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }

        const data = await response.json();

        console.log("Gmail API data:", data);
        console.log("Number of Gmail messages:", data.length);

        const formattedEmails = data.map((email) => {
          const headers = email.payload?.headers || [];

          const getHeader = (name) => {
            const header = headers.find(
              (h) =>
                h.name?.toLowerCase() === name.toLowerCase()
            );

            return header?.value || "";
          };

          const from = getHeader("From");
          const subject = getHeader("Subject");
          const date = getHeader("Date");

          const labelIds = email.labelIds || [];

          const emailDate = new Date(date);
          const now = new Date();

          const daysAgo = Math.floor(
            (now - emailDate) /
              (1000 * 60 * 60 * 24)
          );

          const emailMatch = from.match(/<([^>]+)>/);

          const emailAddress = emailMatch
            ? emailMatch[1]
            : from;

          return {
            id: email.id,
            sender: from,
            email: emailAddress,
            subject: subject || "(No Subject)",
            body: email.snippet || "",
            preview: email.snippet || "",
            date: date,
            daysAgo: daysAgo,
            unread: labelIds.includes("UNREAD"),
            folder: labelIds.includes("SENT")
              ? "sent"
              : "inbox",
            labels: labelIds,
          };
        });

        console.log(
          "Formatted emails:",
          formattedEmails
        );

        setEmails(formattedEmails);
        setLoadingEmails(false);
        setEmailError("");

        console.log(
          "Total emails loaded into React:",
          formattedEmails.length
        );
      } catch (error) {
        console.error(
          "Email loading error:",
          error
        );

        setEmails([]);
        setEmailError(
          "Unable to load Gmail emails."
        );
        setLoadingEmails(false);
      }
    };

    loadEmails();
  }, []);

  // =========================
  // FILTER EMAILS
  // =========================

  const filteredEmails = emails.filter(
    (email) => {
      // -------------------------
      // Inbox
      // -------------------------

      if (
        activeFolder === "inbox" &&
        !email.labels?.includes("INBOX")
      ) {
        return false;
      }

      // -------------------------
      // Sent
      // -------------------------

      if (
        activeFolder === "sent" &&
        !email.labels?.includes("SENT")
      ) {
        return false;
      }

      // -------------------------
      // Drafts
      // -------------------------

      if (activeFolder === "drafts") {
        return false;
      }

      // -------------------------
      // Trash
      // -------------------------

      if (activeFolder === "trash") {
        return false;
      }

      // -------------------------
      // Search
      // -------------------------

      const search =
        searchTerm.toLowerCase().trim();

      if (search) {
        const sender =
          email.sender?.toLowerCase() || "";

        const emailAddress =
          email.email?.toLowerCase() || "";

        const emailSubject =
          email.subject?.toLowerCase() || "";

        if (
          !sender.includes(search) &&
          !emailAddress.includes(search) &&
          !emailSubject.includes(search)
        ) {
          return false;
        }
      }

      // -------------------------
      // Unread
      // -------------------------

      if (
        filter === "unread" &&
        !email.unread
      ) {
        return false;
      }

      // -------------------------
      // This Week
      // -------------------------

      if (
        filter === "week" &&
        email.daysAgo > 7
      ) {
        return false;
      }

      return true;
    }
  );

  // =========================
  // DEBUG INFORMATION
  // =========================

  console.log(
    "Total emails:",
    emails.length
  );

  console.log(
    "Visible emails:",
    filteredEmails.length
  );

  console.log(
    "Current filter:",
    filter
  );

  // =========================
  // OPEN EMAIL - LOAD FULL EMAIL
  // =========================

  const decodeBase64Url = (data) => {
    try {
      const base64 = data
        .replace(/-/g, "+")
        .replace(/_/g, "/");

      const binaryString = atob(base64);

      const bytes = Uint8Array.from(
        binaryString,
        (char) => char.charCodeAt(0)
      );

      return new TextDecoder("utf-8").decode(bytes);
    } catch (error) {
      console.error(
        "Base64 decode error:",
        error
      );

      return "";
    }
  };

  const getBodyFromParts = (parts) => {
    for (const part of parts) {
      if (
        part.mimeType === "text/plain" &&
        part.body?.data
      ) {
        return decodeBase64Url(
          part.body.data
        );
      }

      if (part.parts) {
        const nestedBody =
          getBodyFromParts(part.parts);

        if (nestedBody) {
          return nestedBody;
        }
      }
    }

    return "";
  };

  const openEmail = async (email) => {
    try {
      console.log(
        "Opening email:",
        email.id
      );

      const response = await fetch(
        `http://localhost:8080/api/emails/${email.id}`,
        {
          credentials: "include",
        }
      );

      console.log(
        "Full email API status:",
        response.status
      );

      if (response.status === 401) {
        alert(
          "Your Google session has expired. Please login again."
        );
        return;
      }

      if (!response.ok) {
        throw new Error(
          `Failed to load email: ${response.status}`
        );
      }

      const fullEmail =
        await response.json();

      console.log(
        "Full Gmail email:",
        fullEmail
      );

      const headers =
        fullEmail.payload?.headers || [];

      const getHeader = (name) => {
        const header = headers.find(
          (h) =>
            h.name?.toLowerCase() ===
            name.toLowerCase()
        );

        return header?.value || "";
      };

      const from = getHeader("From");
      const subject = getHeader("Subject");
      const date = getHeader("Date");

      const emailMatch =
        from.match(/<([^>]+)>/);

      const emailAddress = emailMatch
        ? emailMatch[1]
        : from;

      let emailBody = "";

      const payload =
        fullEmail.payload;

      if (payload?.body?.data) {
        emailBody =
          decodeBase64Url(
            payload.body.data
          );
      } else if (payload?.parts) {
        emailBody =
          getBodyFromParts(
            payload.parts
          );
      }

      const updatedEmail = {
        ...email,
        sender: from || email.sender,
        email:
          emailAddress || email.email,
        subject:
          subject || email.subject,
        date: date || email.date,
        body:
          emailBody ||
          email.snippet ||
          "",
        preview:
          emailBody ||
          email.snippet ||
          "",
      };

      setSelectedEmail(
        updatedEmail
      );

    } catch (error) {
      console.error(
        "Error opening email:",
        error
      );

      alert(
        "Unable to load the full email."
      );
    }
  };

  // =========================
  // CLOSE EMAIL
  // =========================

  const closeEmail = () => {
    setSelectedEmail(null);
  };

  // =========================
  // REPLY
  // =========================

  const replyToEmail = (email) => {
    setTo(email.email);

    setSubject(
      email.subject.startsWith("Re:")
        ? email.subject
        : `Re: ${email.subject}`
    );

    setBody("");
    setShowCompose(true);
  };

  // =========================
  // COMPOSE
  // =========================

  const openCompose = () => {
    setTo("");
    setSubject("");
    setBody("");
    setShowCompose(true);
  };

  // =========================
  // SEND
  // =========================

  const sendEmail = async () => {
    if (!to.trim()) {
      alert("Please enter a recipient.");
      return;
    }

    if (!subject.trim()) {
      alert("Please enter a subject.");
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:8080/api/emails/send",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            to: to.trim(),
            subject: subject.trim(),
            body: body,
          }),
        }
      );

      if (response.status === 401) {
        alert(
          "Your Google account is not authenticated."
        );
        return;
      }

      const data =
        await response.json();

      console.log(
        "Send email response:",
        data
      );

      if (
        !response.ok ||
        !data.success
      ) {
        alert(
          data.message ||
            "Failed to send email."
        );
        return;
      }

      alert(
        "Email sent successfully! ✅"
      );

      setShowCompose(false);
      setTo("");
      setSubject("");
      setBody("");

      // Refresh emails after sending
      try {
        const emailResponse =
          await fetch(
            "http://localhost:8080/api/emails",
            {
              credentials: "include",
            }
          );

        if (emailResponse.ok) {
          const emailData =
            await emailResponse.json();

          const mappedEmails =
            emailData.map((email) => {
              const headers =
                email.payload?.headers ||
                [];

              const fromHeader =
                headers.find(
                  (h) =>
                    h.name.toLowerCase() ===
                    "from"
                );

              const subjectHeader =
                headers.find(
                  (h) =>
                    h.name.toLowerCase() ===
                    "subject"
                );

              const dateHeader =
                headers.find(
                  (h) =>
                    h.name.toLowerCase() ===
                    "date"
                );

              const from =
                fromHeader?.value ||
                "Unknown Sender";

              const subject =
                subjectHeader?.value ||
                "(No Subject)";

              const date =
                dateHeader?.value ||
                "";

              const emailMatch =
                from.match(
                  /<([^>]+)>/
                );

              const emailAddress =
                emailMatch
                  ? emailMatch[1]
                  : from;

              const parsedDate = date
                ? new Date(date)
                : new Date();

              const daysAgo =
                Math.floor(
                  (Date.now() -
                    parsedDate.getTime()) /
                    (1000 *
                      60 *
                      60 *
                      24)
                );

              const labelIds =
                email.labelIds || [];

              return {
                id: email.id,
                sender: from,
                email: emailAddress,
                subject: subject,
                body:
                  email.snippet || "",
                preview:
                  email.snippet || "",
                date: date,
                daysAgo: daysAgo,
                unread:
                  labelIds.includes(
                    "UNREAD"
                  ),
                folder:
                  labelIds.includes(
                    "SENT"
                  )
                    ? "sent"
                    : "inbox",
                labels: labelIds,
              };
            });

          setEmails(
            mappedEmails
          );
        }
      } catch (refreshError) {
        console.error(
          "Email refresh failed:",
          refreshError
        );
      }
    } catch (error) {
      console.error(
        "Send email error:",
        error
      );

      alert(
        "Could not connect to the backend. Make sure Spring Boot is running."
      );
    }
  };

  // =========================
  // AI COMMAND
  // =========================

  const handleAICommand = async () => {
    const command =
      aiCommand.trim();

    if (!command) {
      return;
    }

    console.log(
      "AI button clicked:",
      command
    );

    setAiMessage(
      `You: ${command}`
    );

    try {
      // =========================
      // CALL SPRING BOOT AI API
      // =========================

      const response =
        await fetch(
          "http://localhost:8080/api/ai/command",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              command: command,
            }),
          }
        );

      console.log(
        "AI API status:",
        response.status
      );

      if (!response.ok) {
        throw new Error(
          `AI request failed: ${response.status}`
        );
      }

      const data =
        await response.json();

      console.log(
        "AI Response:",
        data
      );

      // =========================
      // CHECK API SUCCESS
      // =========================

      if (!data.success) {
        setAiMessage(
          data.message ||
            "Sorry, I couldn't understand that."
        );

        setAiCommand("");
        return;
      }

      // =========================
      // PARSE AI RESULT
      // =========================

      let aiResult;

      try {
        let resultText =
          data.result;

        resultText =
          resultText
            .replace(
              /^```json\s*/i,
              ""
            )
            .replace(
              /^```\s*/i,
              ""
            )
            .replace(
              /\s*```$/,
              ""
            )
            .trim();

        aiResult =
          JSON.parse(
            resultText
          );

      } catch (error) {
        console.error(
          "Could not parse AI result:",
          data.result
        );

        setAiMessage(
          "The AI returned an unexpected response."
        );

        setAiCommand("");
        return;
      }

      console.log(
        "AI Action:",
        aiResult
      );

      const action =
        aiResult.action;

      // =========================
      // OPEN INBOX
      // =========================

      if (
        action ===
        "OPEN_INBOX"
      ) {
        setActiveFolder(
          "inbox"
        );

        setFilter("all");
        setSearchTerm("");
        setSelectedEmail(null);

        setAiMessage(
          "Opening your inbox."
        );
      }

      // =========================
      // OPEN SENT
      // =========================

      else if (
        action ===
        "OPEN_SENT"
      ) {
        setActiveFolder(
          "sent"
        );

        setFilter("all");
        setSearchTerm("");
        setSelectedEmail(null);

        setAiMessage(
          "Opening your sent emails."
        );
      }

      // =========================
      // OPEN DRAFTS
      // =========================

      else if (
        action ===
        "OPEN_DRAFTS"
      ) {
        setActiveFolder(
          "drafts"
        );

        setFilter("all");
        setSearchTerm("");
        setSelectedEmail(null);

        setAiMessage(
          "Opening your drafts."
        );
      }

      // =========================
      // SHOW UNREAD
      // =========================

      else if (
        action ===
        "SHOW_UNREAD"
      ) {
        console.log(
          "Executing SHOW_UNREAD"
        );

        setActiveFolder(
          "inbox"
        );

        setFilter(
          "unread"
        );

        setSearchTerm("");
        setSelectedEmail(null);

        setAiMessage(
          "Showing your unread emails."
        );
      }

      // =========================
      // SHOW THIS WEEK
      // =========================

      else if (
        action ===
        "SHOW_THIS_WEEK"
      ) {
        setActiveFolder(
          "inbox"
        );

        setFilter("week");
        setSearchTerm("");
        setSelectedEmail(null);

        setAiMessage(
          "Showing emails from this week."
        );
      }

      // =========================
      // SHOW ALL
      // =========================

      else if (
        action ===
        "SHOW_ALL"
      ) {
        setActiveFolder(
          "inbox"
        );

        setFilter("all");
        setSearchTerm("");
        setSelectedEmail(null);

        setAiMessage(
          "Showing all emails."
        );
      }

      // =========================
      // SEARCH EMAILS
      // =========================

      else if (
        action ===
        "SEARCH_EMAILS"
      ) {
        setActiveFolder(
          "inbox"
        );

        setFilter("all");
        setSelectedEmail(null);

        if (
          aiResult.searchTerm
        ) {
          setSearchTerm(
            aiResult.searchTerm
          );
        } else if (
          aiResult.sender
        ) {
          setSearchTerm(
            aiResult.sender
          );
        }

        setAiMessage(
          aiResult.message ||
            "Searching your emails."
        );
      }

      // =========================
      // COMPOSE EMAIL
      // =========================

      else if (
        action ===
        "COMPOSE_EMAIL"
      ) {
        setTo(
          aiResult.to || ""
        );

        setSubject(
          aiResult.subject || ""
        );

        setBody(
          aiResult.body || ""
        );

        setShowCompose(true);

        setAiMessage(
          aiResult.message ||
            "Opening the compose window."
        );
      }

      // =========================
      // REPLY TO CURRENT
      // =========================

      else if (
        action ===
        "REPLY_TO_CURRENT"
      ) {
        if (selectedEmail) {
          replyToEmail(
            selectedEmail
          );

          setAiMessage(
            "Opening a reply to this email."
          );
        } else {
          setAiMessage(
            "Please open an email first, then say 'reply to this'."
          );
        }
      }

      // =========================
      // OPEN LATEST EMAIL
      // =========================

      else if (
        action ===
        "OPEN_LATEST_EMAIL"
      ) {
        const sender =
          aiResult.sender || "";

        if (!sender) {
          setAiMessage(
            "Please specify the sender's name."
          );
        } else {
          console.log(
            "Looking for sender:",
            sender
          );

          const requestedSender =
            sender.toLowerCase().trim();

          const matchingEmails =
            emails.filter((email) => {
              const senderName =
                email.sender?.toLowerCase() || "";

              const emailAddress =
                email.email?.toLowerCase() || "";

              return (
                senderName.includes(requestedSender) ||
                emailAddress.includes(requestedSender)
              );
            });

          console.log(
            "Matching emails:",
            matchingEmails
          );

          if (matchingEmails.length > 0) {
            // Sort newest email first
            const sortedEmails =
              [...matchingEmails].sort(
                (a, b) =>
                  new Date(b.date) -
                  new Date(a.date)
              );

            const latestEmail =
              sortedEmails[0];

            console.log(
              "Latest matching email:",
              latestEmail
            );

            await openEmail(latestEmail);

            setAiMessage(
              aiResult.message ||
                `Opening the latest email from ${sender}.`
            );
          } else {
            setAiMessage(
              `I couldn't find any emails from ${sender}.`
            );
          }
        }
      }

      // =========================
      // UNKNOWN ACTION
      // =========================

      else {
        setAiMessage(
          aiResult.message ||
            "I understood your request, but I don't know how to perform it yet."
        );
      }

    } catch (error) {
      console.error(
        "AI error:",
        error
      );

      setAiMessage(
        "I couldn't connect to the AI assistant. Make sure the backend is running."
      );
    }

    // Clear input
    setAiCommand("");
  };

  // =========================
  // AI ENTER
  // =========================

  const handleAIKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAICommand();
    }
  };

  // =========================
  // CHANGE FOLDER
  // =========================

  const changeFolder = (
    folder
  ) => {
    setActiveFolder(folder);
    setFilter("all");
    setSearchTerm("");
    setSelectedEmail(null);
  };

  // =========================
  // RENDER
  // =========================

  return (
    <div className="app">

      {/* =========================
          SIDEBAR
      ========================= */}

      <aside className="sidebar">

        <div className="logo">
          <Mail size={26} />
          <span>MailAI</span>
        </div>

        <button
          className="compose-button"
          onClick={openCompose}
        >
          <Plus size={20} />
          Compose
        </button>

        <nav className="nav">

          {/* INBOX */}

          <button
            className={
              activeFolder === "inbox"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              changeFolder("inbox")
            }
          >
            <Inbox size={19} />

            <span>Inbox</span>

            <span className="count">
              {
                emails.filter(
                  (email) =>
                    email.folder ===
                      "inbox" &&
                    email.unread
                ).length
              }
            </span>
          </button>

          {/* SENT */}

          <button
            className={
              activeFolder === "sent"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              changeFolder("sent")
            }
          >
            <Send size={19} />

            <span>Sent</span>
          </button>

          {/* DRAFTS */}

          <button
            className={
              activeFolder ===
              "drafts"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              changeFolder("drafts")
            }
          >
            <FileText size={19} />

            <span>Drafts</span>
          </button>

          {/* TRASH */}

          <button
            className={
              activeFolder ===
              "trash"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              changeFolder("trash")
            }
          >
            <Trash2 size={19} />

            <span>Trash</span>
          </button>

        </nav>

        <div className="sidebar-bottom">

          <div className="profile">

            <div className="avatar">
              <User size={18} />
            </div>

            <div>

              <div className="user-name">
                Harshavardhani
              </div>

              <div className="user-email">
                Gmail Account
              </div>

            </div>

          </div>

        </div>

      </aside>

      {/* =========================
          MAIN
      ========================= */}

      <main className="main">

        <header className="header">

          <div className="search-box">

            <Search size={20} />

            <input
              type="text"
              placeholder="Search emails..."
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(
                  e.target.value
                )
              }
            />

            {searchTerm && (
              <button
                className="clear-search"
                onClick={() =>
                  setSearchTerm("")
                }
              >
                <X size={16} />
              </button>
            )}

          </div>

          <div className="header-title">

            {activeFolder ===
            "inbox"
              ? "Inbox"
              : activeFolder ===
                "sent"
              ? "Sent"
              : activeFolder ===
                "drafts"
              ? "Drafts"
              : "Trash"}

          </div>

        </header>

        {/* =========================
            FILTER BAR
        ========================= */}

        <div className="filter-buttons">

          <button
            className={
              filter === "all"
                ? "filter-active"
                : ""
            }
            onClick={() =>
              setFilter("all")
            }
          >
            All
          </button>

          <button
            className={
              filter === "unread"
                ? "filter-active"
                : ""
            }
            onClick={() =>
              setFilter("unread")
            }
          >
            Unread
          </button>

          <button
            className={
              filter === "week"
                ? "filter-active"
                : ""
            }
            onClick={() =>
              setFilter("week")
            }
          >
            This Week
          </button>

        </div>

        {/* =========================
            EMAIL LIST
        ========================= */}

        <section className="email-list">

          {loadingEmails ? (

            <div className="empty-state">

              <Mail size={45} />

              <h3>
                Loading your Gmail emails...
              </h3>

              <p>
                Please wait while your mailbox is loaded.
              </p>

            </div>

          ) : emailError ? (

            <div className="empty-state">

              <Mail size={45} />

              <h3>
                Unable to load emails
              </h3>

              <p>
                {emailError}
              </p>

            </div>

          ) : filteredEmails.length ===
            0 ? (

            <div className="empty-state">

              <Mail size={45} />

              <h3>
                No emails found.
              </h3>

              <p>
                Total Gmail emails loaded:{" "}
                {emails.length}
              </p>

            </div>

          ) : (

            filteredEmails.map(
              (email) => (

                <div
                  key={email.id}
                  className={
                    email.unread
                      ? "email-row unread"
                      : "email-row"
                  }
                  onClick={() =>
                    openEmail(email)
                  }
                >

                  <div className="avatar">

                    {email.sender
                      ?.charAt(0)
                      ?.toUpperCase() ||
                      "?"}

                  </div>

                  <div className="email-content">

                    <div className="email-top">

                      <span className="sender-name">
                        {email.sender}
                      </span>

                      <span className="email-date">
                        {email.date}
                      </span>

                    </div>

                    <div className="email-subject">
                      {email.subject}
                    </div>

                    <div className="email-preview">
                      {email.preview}
                    </div>

                  </div>

                </div>

              )
            )

          )}

        </section>

      </main>

      {/* =========================
          AI ASSISTANT
      ========================= */}

      <aside className="ai-panel">

        <div className="ai-header">

          <div className="ai-title">

            <div className="ai-icon">
              <Sparkles size={20} />
            </div>

            <div>

              <h3>
                AI Assistant
              </h3>

              <span>
                MailAI
              </span>

            </div>

          </div>

        </div>

        <div className="ai-messages">

          <div className="ai-message">

            <div className="ai-avatar">
              <Bot size={18} />
            </div>

            <div className="ai-message-content">
              {aiMessage}
            </div>

          </div>

          <div className="suggestions">

            <p>
              Try asking:
            </p>

            <button
              onClick={() =>
                setAiCommand(
                  "show unread emails"
                )
              }
            >
              Show unread emails
            </button>

            <button
              onClick={() =>
                setAiCommand(
                  "show emails from the last 7 days"
                )
              }
            >
              Show emails from this week
            </button>

            <button
              onClick={() =>
                setAiCommand(
                  "open latest email from David"
                )
              }
            >
              Open latest email from David
            </button>

            <button
              onClick={() =>
                setAiCommand(
                  "compose an email"
                )
              }
            >
              Compose an email
            </button>

            {selectedEmail && (

              <button
                onClick={() =>
                  setAiCommand(
                    "reply to this"
                  )
                }
              >
                Reply to this
              </button>

            )}

          </div>

        </div>

        {/* =========================
            AI INPUT
        ========================= */}

        <div className="ai-input-container">

          <input
            type="text"
            placeholder="Ask MailAI..."
            value={aiCommand}
            onChange={(e) =>
              setAiCommand(
                e.target.value
              )
            }
            onKeyDown={
              handleAIKeyDown
            }
          />

          <button
            onClick={
              handleAICommand
            }
          >
            <Sparkles size={18} />
          </button>

        </div>

      </aside>

      {/* =========================
          EMAIL DETAIL
      ========================= */}

      {selectedEmail && (

        <div className="email-detail-overlay">

          <div className="email-detail">

            <div className="detail-header">

              <button
                className="back-button"
                onClick={closeEmail}
              >
                <ArrowLeft size={20} />
                Back
              </button>

              <div className="detail-actions">

                <button
                  onClick={() =>
                    replyToEmail(
                      selectedEmail
                    )
                  }
                >
                  <Reply size={18} />
                  Reply
                </button>

                <button>
                  <MoreVertical
                    size={18}
                  />
                </button>

              </div>

            </div>

            <div className="detail-content">

              <h1>
                {selectedEmail.subject}
              </h1>

              <div className="sender-detail">

                <div className="email-avatar">

                  {selectedEmail.sender
                    ?.charAt(0)
                    ?.toUpperCase() ||
                    "?"}

                </div>

                <div>

                  <strong>
                    {selectedEmail.sender}
                  </strong>

                  <div>
                    {selectedEmail.email}
                  </div>

                </div>

                <span className="detail-date">
                  {selectedEmail.date}
                </span>

              </div>

              <div className="email-body">

                <p>
                  {selectedEmail.body}
                </p>

                <p>
                  This email was loaded from your
                  connected Gmail account.
                </p>

              </div>

            </div>

          </div>

        </div>

      )}

      {/* =========================
          COMPOSE
      ========================= */}

      {showCompose && (

        <div className="compose-overlay">

          <div className="compose-modal">

            <div className="compose-header">

              <h3>
                New Message
              </h3>

              <button
                onClick={() =>
                  setShowCompose(false)
                }
              >
                <X size={20} />
              </button>

            </div>

            <div className="compose-body">

              <input
                type="email"
                placeholder="To"
                value={to}
                onChange={(e) =>
                  setTo(e.target.value)
                }
              />

              <input
                type="text"
                placeholder="Subject"
                value={subject}
                onChange={(e) =>
                  setSubject(
                    e.target.value
                  )
                }
              />

              <textarea
                placeholder="Write your message..."
                value={body}
                onChange={(e) =>
                  setBody(
                    e.target.value
                  )
                }
              />

            </div>

            <div className="compose-footer">

              <button
                className="attachment-button"
              >
                <Paperclip size={18} />
              </button>

              <button
                className="send-button"
                onClick={sendEmail}
              >
                <Send size={17} />
                Send
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default App;