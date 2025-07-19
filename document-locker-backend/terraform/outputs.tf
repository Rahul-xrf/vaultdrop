output "instance_public_ip" {
  value = aws_instance.locker_instance.public_ip
}

output "s3_bucket_name" {
  value = aws_s3_bucket.locker_bucket.id
}
