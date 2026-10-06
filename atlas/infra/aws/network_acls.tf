# Second, stateless layer of segmentation behind the Security Groups above
# — explicit evidence that the data tier subnets are isolated at the
# subnet level, not just by SG membership. Deliberately minimal (allow
# intra-VPC + return traffic only); Security Groups remain the primary
# access-control mechanism.

resource "aws_network_acl" "private" {
  vpc_id     = aws_vpc.main.id
  subnet_ids = aws_subnet.private[*].id
  tags       = { Name = "${var.project}-${var.environment}-private-nacl" }
}

resource "aws_network_acl_rule" "private_in_vpc" {
  network_acl_id = aws_network_acl.private.id
  rule_number    = 100
  egress         = false
  protocol       = "-1"
  rule_action    = "allow"
  cidr_block     = var.vpc_cidr
  from_port      = 0
  to_port        = 0
}

resource "aws_network_acl_rule" "private_in_ephemeral_return" {
  # Return traffic from NAT/internet responses to outbound calls the private subnet itself initiated (e.g. Amazon SP-API/LWA responses).
  network_acl_id = aws_network_acl.private.id
  rule_number    = 110
  egress         = false
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = "0.0.0.0/0"
  from_port      = 1024
  to_port        = 65535
}

resource "aws_network_acl_rule" "private_out_all" {
  network_acl_id = aws_network_acl.private.id
  rule_number    = 100
  egress         = true
  protocol       = "-1"
  rule_action    = "allow"
  cidr_block     = "0.0.0.0/0"
  from_port      = 0
  to_port        = 0
}
