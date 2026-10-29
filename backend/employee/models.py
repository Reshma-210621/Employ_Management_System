from django.db import models

# Create your models here.
class Employee(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=15)
    department = models.CharField(max_length=100)
    position = models.CharField(max_length=100)
    salary = models.DecimalField(max_digits=10,decimal_places=2)
    joining_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

def __str__(self):
    return self.name


