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
interface EmailConfirmationProps {
  orgName: string;
  keyName: string;
}

export default function ApiExpiredReminder({
  keyName,
  orgName,
}: EmailConfirmationProps) {
  const previewText =`[Editframe] Your API key "${keyName}" is about to expire`;
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
              Your API key   <strong>{keyName}</strong> is about to expire for your organization:{" "}
              <strong>{orgName}</strong>
            </Text>
            <Text style={text}>
              Please regenerate your API key to avoid any service interruptions.
            </Text>
            <Text style={text}>
              If you have any questions, please contact us at{" "}
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

ApiExpiredReminder.PreviewProps = {
  orgName: "",
  keyName: "",
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
