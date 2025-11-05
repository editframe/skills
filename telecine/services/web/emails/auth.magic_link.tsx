import EmailButton from "./components/Button";
import Logo from "./components/Logo";
import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
interface MagicLinkProps {
  token: string;
  host: string;
}

export default function MagicLink({ token, host }: MagicLinkProps) {
  const previewText = "Login with magic link";

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Logo />
          <Section>
            <Text style={text}>Hey,</Text>
            <Text style={text}>
              Someone recently requested a login link for your Editframe
              account. If this was you, you can login here:
            </Text>
            <EmailButton
              href={`${host}/auth/magic-link/${token}`}
              label="Login with magic link"
            />
            <Text style={text}>
              If you didn't request this, just ignore and delete this message.
            </Text>
            <Text style={text}>
              To keep your account secure, please don't forward this email to
              anyone. If you need help, please contact us at{" "}
              <a href="mailto:team@editframe.com">team@editframe.com</a>
            </Text>
          </Section>
          <Text style={text}>Thanks,</Text>
          <Text style={text}>The Editframe team</Text>
        </Container>
      </Body>
    </Html>
  );
}

MagicLink.PreviewProps = {
  token: "",
  host: "",
} satisfies MagicLinkProps;
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
