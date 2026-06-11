import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Tailwind,
  Row,
  Column,
  Hr,
} from "react-email";

export type BookingNotificationEmailProps = {
  customer: string;
  service: string;
  deadline: string;
  phone: string;
  address: string;
  email?: string;
  branch: string;
  notes?: string;
};

const BookingNotificationEmail = ({
  customer,
  service,
  deadline,
  phone,
  address,
  branch,
  notes,
}: BookingNotificationEmailProps) => {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        📋 New booking — {customer} · {service} · {branch}
      </Preview>
      <Tailwind>
        <Body className="bg-transparent font-montserrat py-[40px]">
          <Container className="bg-white border-2 border-[#4f46e5] rounded-[16px] max-w-[600px] mx-auto overflow-hidden">
            {/* ── Header ── */}
            <Section className="bg-[#4f46e5] px-[40px] py-[32px]">
              <Heading className="text-[13px] font-bold tracking-[0.18em] uppercase text-white/70 m-0 mb-[6px]">
                Autoreception.AI
              </Heading>
              <Heading className="text-[28px] font-black text-white m-0 leading-tight">
                New Booking
              </Heading>
              <Text className="text-[14px] text-white/80 m-0 mt-[6px]">
                A customer just booked via your AI receptionist.
              </Text>
            </Section>

            {/* ── Body ── */}
            <Section className="px-[40px] py-[32px]">
              <Heading className="text-[11px] font-bold tracking-[0.14em] uppercase text-[#888] m-0 mb-[16px]">
                Booking Details
              </Heading>

              {[
                { label: "Customer", value: customer },
                { label: "Service", value: service },
                { label: "Deadline", value: deadline },
                { label: "Phone", value: phone },
                { label: "Address", value: address },
                { label: "Branch", value: branch },
              ].map(({ label, value }) => (
                <Row key={label} className="mb-[12px]">
                  <Column className="w-[140px]">
                    <Text className="text-[12px] font-bold uppercase tracking-wide text-[#888] m-0">
                      {label}
                    </Text>
                  </Column>
                  <Column>
                    <Text className="text-[15px] font-semibold text-[#111] m-0">
                      {value}
                    </Text>
                  </Column>
                </Row>
              ))}

              {/* Notes */}
              {notes && (
                <>
                  <Hr className="border-[#e5e7eb] my-[24px]" />
                  <Heading className="text-[11px] font-bold tracking-[0.14em] uppercase text-[#888] m-0 mb-[10px]">
                    Additional Notes
                  </Heading>
                  <Section className="bg-[#f5f5f5] rounded-[10px] px-[20px] py-[16px]">
                    <Text className="text-[14px] text-[#333] leading-[22px] m-0">
                      {notes}
                    </Text>
                  </Section>
                </>
              )}

              <Hr className="border-[#e5e7eb] my-[28px]" />

              {/* Action nudge */}
              <Section className="bg-[#eef2ff] rounded-[10px] px-[20px] py-[16px]">
                <Text className="text-[13px] font-bold text-[#4f46e5] m-0 mb-[4px]">
                  ⚡ Action Required
                </Text>
                <Text className="text-[13px] text-[#555] m-0 leading-[20px]">
                  Call <strong>{customer}</strong> on{" "}
                  <strong>{phone}</strong> to confirm the booking.
                </Text>
              </Section>
            </Section>

            {/* ── Footer ── */}
            <Section className="bg-[#f5f5f5] px-[40px] py-[20px]">
              <Text className="text-[11px] text-[#999] text-center m-0">
                © {new Date().getFullYear()} Autoreception.AI · Booking
                captured automatically from a live call.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default BookingNotificationEmail;