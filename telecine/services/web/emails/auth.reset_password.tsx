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
import EmailButton from "./components/Button";
import Logo from "./components/Logo";
interface EmailResetPasswordProps {
  token: string;
  host: string;
}

export default function EmailResetPassword({
  token,
  host,
}: EmailResetPasswordProps) {
  const previewText = "Reset your password";

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
              Someone recently requested a password change for your Editframe
              account. If this was you, you can set a new password here:
            </Text>
            <EmailButton
              href={`${host}/auth/update-password/${token}`}
              label="Reset your password"
            />
            <Text style={text}>
              If you don&apos;t want to change your password or didn&apos;t
              request this, just ignore and delete this message.
            </Text>
            <Text style={text}>
              To keep your account secure, please don&apos;t forward this email
              to anyone. If you need help, please contact us at{" "}
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

EmailResetPassword.PreviewProps = {
  token: "abc123",
  host: "https://example.com",
} satisfies EmailResetPasswordProps;

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
