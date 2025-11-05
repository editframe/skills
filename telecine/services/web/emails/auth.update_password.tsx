import {
  Body,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import Logo from "./components/Logo";

export default function EmailUpdatePassword() {
  const previewText = "Your password has been updated";

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Logo />
          <Section>
            <Text style={text}>Hi,</Text>
            <Text style={text}>
              Someone recently updated the password for your Editframe account.
              If this was you, you can ignore this message. If you didn&apos;t
              update your password, please contact us immediately at{" "}
              <Link style={anchor} href="mailto:team@editframe.com">
                team@editframe.com
              </Link>
            </Text>
            <Text style={text}>Thanks,</Text>
            <Text style={text}>The Editframe team</Text>
          </Section>
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

const anchor = {
  textDecoration: "underline",
};
