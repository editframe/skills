import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Text,
  Link,
  Hr,
} from "@react-email/components";
import Logo from "./components/Logo";
import EmailButton from "./components/Button";

export default function WelcomeEmail() {
  const previewText = "Welcome to Editframe!";

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Logo />
          <Hr style={hr} />
          <Text style={text}>
            Thanks for submitting your account information. You're now ready to
            create your first video with Editframe!
          </Text>
          <Text style={text}>You can log in to your account at </Text>
          <EmailButton
            label="View your account"
            href={`${process.env.WEB_HOST}/auth/login`}
          />

          <Hr style={hr} />
          <Text style={text}>
            If you have any questions about getting started, we recommend
            checking out our{" "}
            <Link style={anchor} href="https://editframe.com/docs">
              docs
            </Link>{" "}
          </Text>
          <Text style={text}>
            If you're ready to start creating videos, you can{" "}
            <Link style={anchor} href={`${process.env.WEB_HOST}/projects/new`}>
              start a new project here
            </Link>{" "}
          </Text>

          <Hr style={hr} />

          <Text style={text}>
            We'll be here to help you with any step along the way. You can find
            answers to most questions and get in touch with us at{" "}
            <Link style={anchor} href="mailto:team@editframe.com">
              team@editframe.com{" "}
            </Link>
          </Text>
          <Text style={text}>— The Editframe team</Text>
          <Hr style={hr} />
          <Text style={footer}>
            You're receiving this email because you signed up for an Editframe
            account. If you have any questions, please contact us at{" "}
            <Link style={anchor} href="mailto:team@editframe.com">
              team@editframe.com{" "}
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  padding: "10px 0",
};

const container = {
  backgroundColor: "#ffffff",
  border: "1px solid #f0f0f0",
  padding: "45px",
};

const text = {
  fontSize: "16px",
  fontFamily:
    "'Open Sans', 'HelveticaNeue-Light', 'Helvetica Neue Light', 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif",
  fontWeight: "300",
  color: "#404040",
  lineHeight: "26px",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  fontFamily:
    "'Open Sans', 'HelveticaNeue-Light', 'Helvetica Neue Light', 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif",
};
const anchor = {
  color: "#556cd6",
};
const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 0",
};
