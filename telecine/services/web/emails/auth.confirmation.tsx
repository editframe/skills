import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import EmailButton from "./components/Button";
import Logo from "./components/Logo";
interface EmailConfirmationProps {
  token: string;
  host: string;
}

export default function EmailConfirmation({
  token,
  host,
}: EmailConfirmationProps) {
  const previewText = "Confirm your email address";

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
              Welcome to Editframe! Please confirm your email address by
              clicking
            </Text>
            <EmailButton
              href={`${host}/auth/confirm_email/${token}`}
              label="Confirm your email address"
            />
            <Text style={text}>
              If you didn&apos;t sign up for an Editframe account, just ignore
              and delete this message.
            </Text>
            <Text style={text}>Thanks,</Text>
            <Text style={text}>The Editframe team</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

EmailConfirmation.PreviewProps = {
  token: "",
  host: "",
} satisfies EmailConfirmationProps;

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
