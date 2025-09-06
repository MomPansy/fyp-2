import { Anchor, type AnchorProps } from "@mantine/core";
import { createLink, LinkComponent } from "@tanstack/react-router";
import { forwardRef } from "react";

type MantineAnchorProps = Omit<AnchorProps, "href">;

const MantineLinkComponent = forwardRef<HTMLAnchorElement, MantineAnchorProps>(
  (props, ref) => {
    return <Anchor ref={ref} {...props} />;
  },
);

const CreatedLinkComponent = createLink(MantineLinkComponent);

export const CustomAnchor: LinkComponent<typeof MantineLinkComponent> = (
  props,
) => {
  return <CreatedLinkComponent preload="intent" {...props} />;
};
